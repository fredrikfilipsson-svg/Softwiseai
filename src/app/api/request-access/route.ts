import { NextRequest, NextResponse } from "next/server";
import { saveAccessRequest, findAccessByEmail } from "@/lib/storage";

const BLOCKED_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "hotmail.co.uk",
  "outlook.com",
  "yahoo.com",
  "yahoo.co.uk",
  "aol.com",
  "icloud.com",
  "mail.com",
  "protonmail.com",
  "yandex.com",
  "gmx.com",
  "zoho.com",
  "live.com",
];

export async function POST(req: NextRequest) {
  try {
    const { name, email, company } = await req.json();

    if (!name || !email || !company) {
      return NextResponse.json(
        { error: "Name, email, and company are required." },
        { status: 400 }
      );
    }

    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain || BLOCKED_DOMAINS.includes(domain)) {
      return NextResponse.json(
        {
          error:
            "Please use your business email address. Free email providers (Gmail, Hotmail, Yahoo, etc.) are not accepted.",
        },
        { status: 400 }
      );
    }

    const existing = findAccessByEmail(email);
    if (existing) {
      if (existing.status === "approved") {
        return NextResponse.json({
          message: "Your account is already approved. You can sign in.",
          status: "approved",
        });
      }
      return NextResponse.json({
        message:
          "Your access request is pending approval. You will receive an email once approved.",
        status: "pending",
      });
    }

    const request = saveAccessRequest({ name, email, company });

    // In production, this would send an email to info@redresscompliance.com
    // For now, we log the notification
    console.log(
      `[ACCESS REQUEST] New request from ${name} (${email}) at ${company}. ` +
      `Notification would be sent to info@redresscompliance.com`
    );

    return NextResponse.json({
      message:
        "Your access request has been submitted. You will receive an email at " +
        email +
        " once your account is approved by our team.",
      status: "pending",
      requestId: request.id,
    });
  } catch (error) {
    console.error("Access request error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
