import { NextRequest, NextResponse } from "next/server";
import { approveAccessRequest, getAccessRequests } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const { id, adminKey } = await req.json();

    // Simple admin key check — in production, use proper auth
    const expectedKey = process.env.ADMIN_KEY || "softwiseai-admin-2024";
    if (adminKey !== expectedKey) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const approved = approveAccessRequest(id);
    if (!approved) {
      return NextResponse.json(
        { error: "Request not found." },
        { status: 404 }
      );
    }

    // In production, send approval email to the user
    console.log(
      `[ACCESS APPROVED] ${approved.name} (${approved.email}) at ${approved.company} has been approved.`
    );

    return NextResponse.json({
      message: `Access approved for ${approved.email}.`,
      request: approved,
    });
  } catch (error) {
    console.error("Approve access error:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const adminKey = req.nextUrl.searchParams.get("adminKey");
  const expectedKey = process.env.ADMIN_KEY || "softwiseai-admin-2024";
  if (adminKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const requests = getAccessRequests();
  return NextResponse.json({ requests });
}
