import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('MAIL_HOST');

    if (host) {
      const port = +(this.config.get('MAIL_PORT') ?? 587); // cast to number — ConfigService returns strings
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user: this.config.get<string>('MAIL_USER'),
          pass: this.config.get<string>('MAIL_PASS'),
        },
      });
    }
  }

  async sendOrderConfirmation(
    to: string,
    buyerName: string,
    orderId: string,
    items: { productName: string; quantity: number; lineTotal: number }[],
    subtotal: number,
    shippingCost: number,
    total: number,
  ): Promise<void> {
    const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
    const orderUrl = `${appUrl}/account/orders/${orderId}`;

    const itemRows = items
      .map(
        (i) =>
          `<tr>
            <td style="padding:8px 0;border-bottom:1px solid #f0f0f0">${i.productName}</td>
            <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:center">×${i.quantity}</td>
            <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right">$${i.lineTotal.toFixed(2)}</td>
          </tr>`,
      )
      .join('');

    const shippingRow =
      shippingCost === 0
        ? `<tr><td colspan="2" style="padding:8px 0;color:#16a34a">Shipping</td><td style="padding:8px 0;text-align:right;color:#16a34a">Free</td></tr>`
        : `<tr><td colspan="2" style="padding:8px 0">Shipping</td><td style="padding:8px 0;text-align:right">$${shippingCost.toFixed(2)}</td></tr>`;

    const html = `
      <div style="font-family:sans-serif;max-width:560px;margin:auto;color:#18181b">
        <h2 style="margin-bottom:4px">Order Confirmed!</h2>
        <p style="color:#71717a;margin-top:0">Hi ${buyerName}, your order has been placed.</p>
        <table style="width:100%;border-collapse:collapse;margin:24px 0">
          <thead>
            <tr style="border-bottom:2px solid #e5e7eb">
              <th style="text-align:left;padding-bottom:8px">Item</th>
              <th style="text-align:center;padding-bottom:8px">Qty</th>
              <th style="text-align:right;padding-bottom:8px">Price</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
          <tfoot>
            ${shippingRow}
            <tr style="font-weight:bold">
              <td colspan="2" style="padding-top:12px">Total</td>
              <td style="padding-top:12px;text-align:right">$${total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
        <a href="${orderUrl}"
           style="display:inline-block;padding:12px 24px;background:#18181b;
                  color:#fff;border-radius:6px;text-decoration:none;margin:8px 0">
          View Order
        </a>
        <p style="color:#71717a;font-size:13px;margin-top:24px">
          Order ID: ${orderId}
        </p>
      </div>
    `;

    if (!this.transporter) {
      this.logger.log(`[DEV] Order confirmation for ${to} — order ${orderId} — total $${total.toFixed(2)}`);
      return;
    }

    await this.transporter.sendMail({
      from: this.config.get<string>('MAIL_FROM') ?? 'Evyn <noreply@evyn.com>',
      to,
      subject: `Your Evyn order has been confirmed`,
      html,
    });
  }

  async sendSellerInvite(to: string, name: string, token: string): Promise<void> {
    const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
    const setupLink = `${appUrl}/seller-setup?token=${token}`;

    // In dev with no SMTP configured, log the link so you can still test
    if (!this.transporter) {
      this.logger.log(`[DEV] Seller invite link for ${to}: ${setupLink}`);
      return;
    }

    await this.transporter.sendMail({
      from: this.config.get<string>('MAIL_FROM') ?? 'Evyn <noreply@evyn.com>',
      to,
      subject: `You've been invited to sell on Evyn`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:auto">
          <h2>Welcome to Evyn, ${name}!</h2>
          <p>An admin has invited you to become a seller on Evyn.</p>
          <p>Click the button below to set up your account.
             This link expires in <strong>48 hours</strong>.</p>
          <a href="${setupLink}"
             style="display:inline-block;padding:12px 24px;background:#18181b;
                    color:#fff;border-radius:6px;text-decoration:none;margin:16px 0">
            Set Up Your Account
          </a>
          <p style="color:#71717a;font-size:13px">
            Or copy this link:<br>${setupLink}
          </p>
        </div>
      `,
    });
  }
}
