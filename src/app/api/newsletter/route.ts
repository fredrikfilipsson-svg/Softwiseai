import { NextRequest, NextResponse } from "next/server";
import { saveSubscriber, getSubscribers, deleteSubscriber } from "@/lib/storage";

export async function GET() {
  const subscribers = getSubscribers();
  return NextResponse.json({ subscribers });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, company, source } = body;

    if (!email || !name) {
      return NextResponse.json(
        { error: "Name and email are required." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const result = saveSubscriber({
      email: email.trim(),
      name: name.trim(),
      company: company?.trim() || undefined,
      source: source || "landing_page",
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    return NextResponse.json({ subscriber: result }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Subscriber ID is required." }, { status: 400 });
  }

  const deleted = deleteSubscriber(id);
  if (!deleted) {
    return NextResponse.json({ error: "Subscriber not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
