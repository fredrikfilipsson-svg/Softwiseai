import { NextRequest, NextResponse } from "next/server";
import { findAccessByEmail } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    const access = findAccessByEmail(email);

    if (!access) {
      return NextResponse.json({
        hasAccess: false,
        status: "not_found",
        message: "No account found. Please request access first.",
      });
    }

    return NextResponse.json({
      hasAccess: access.status === "approved",
      status: access.status,
      name: access.name,
      company: access.company,
      message:
        access.status === "approved"
          ? "Access granted."
          : "Your access request is pending approval.",
    });
  } catch (error) {
    console.error("Check access error:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
