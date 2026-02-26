import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const { clientName, vendorType, invoiceDate, invoiceAmount, projectRevenue } =
    await req.json();

  if (!clientName || !invoiceDate) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const smtpHost = process.env.SMTP_HOST ?? "smtp.office365.com";
  const smtpPort = parseInt(process.env.SMTP_PORT ?? "587");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM ?? smtpUser;

  if (!smtpUser || !smtpPass) {
    return NextResponse.json(
      { error: "SMTP credentials not configured. Set SMTP_USER and SMTP_PASS environment variables." },
      { status: 500 }
    );
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const formattedAmount = invoiceAmount
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
      }).format(invoiceAmount)
    : "N/A";

  const formattedRevenue = projectRevenue
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
      }).format(projectRevenue)
    : "N/A";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1e40af; color: white; padding: 20px 24px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Invoice Due Reminder</h2>
        <p style="margin: 4px 0 0; opacity: 0.85; font-size: 14px;">SoftwiseAI Finance Tracker</p>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p>An invoice requires attention:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Client</td>
            <td style="padding: 8px 0; font-weight: 600;">${clientName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Vendor</td>
            <td style="padding: 8px 0;">${vendorType}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Invoice Date</td>
            <td style="padding: 8px 0; font-weight: 600; color: #dc2626;">${invoiceDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Invoice Amount</td>
            <td style="padding: 8px 0; font-weight: 600;">${formattedAmount}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Project Revenue</td>
            <td style="padding: 8px 0;">${formattedRevenue}</td>
          </tr>
        </table>
        <p style="font-size: 14px; color: #6b7280;">Please review and process this invoice at your earliest convenience.</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: "invoice@redresscompliance.com",
      subject: `Invoice Due – ${clientName} (${invoiceDate})`,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to send email: ${message}` },
      { status: 500 }
    );
  }
}
