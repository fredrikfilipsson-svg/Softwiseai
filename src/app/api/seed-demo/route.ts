import { NextResponse } from "next/server";
import { saveAccessRequest, findAccessByEmail, approveAccessRequest } from "@/lib/storage";

export async function GET() {
  const demoEmail = "demo@redresscompliance.com";
  let access = findAccessByEmail(demoEmail);

  if (!access) {
    access = saveAccessRequest({
      name: "Demo User",
      email: demoEmail,
      company: "Redress Compliance",
    });
  }

  if (access.status !== "approved") {
    approveAccessRequest(access.id);
  }

  return NextResponse.json({
    message: "Demo account ready. Sign in with: demo@redresscompliance.com",
    email: demoEmail,
  });
}
