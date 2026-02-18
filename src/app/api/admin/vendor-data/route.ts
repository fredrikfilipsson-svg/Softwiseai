import { NextRequest, NextResponse } from "next/server";
import {
  getAdminVendorData,
  saveAdminVendorData,
  deleteAdminVendorData,
} from "@/lib/admin-data";

function checkAdmin(req: NextRequest): boolean {
  const adminKey =
    req.headers.get("x-admin-key") ||
    req.nextUrl.searchParams.get("adminKey");
  const expected = process.env.ADMIN_KEY || "softwiseai-admin-2024";
  return adminKey === expected;
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const data = getAdminVendorData();
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      vendor,
      pricingGuidelines,
      typicalDiscounts,
      contractTerms,
      negotiationTips,
      complianceNotes,
      benchmarkData,
      updatedBy,
    } = body;

    if (!vendor) {
      return NextResponse.json(
        { error: "Vendor name is required." },
        { status: 400 }
      );
    }

    const entry = saveAdminVendorData({
      vendor,
      pricingGuidelines: pricingGuidelines || "",
      typicalDiscounts: typicalDiscounts || "",
      contractTerms: contractTerms || "",
      negotiationTips: negotiationTips || "",
      complianceNotes: complianceNotes || "",
      benchmarkData: benchmarkData || "",
      updatedBy: updatedBy || "admin",
    });

    return NextResponse.json({ entry });
  } catch (error) {
    console.error("Admin vendor data error:", error);
    return NextResponse.json(
      { error: "Failed to save vendor data." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "ID is required." },
      { status: 400 }
    );
  }

  const deleted = deleteAdminVendorData(id);
  if (!deleted) {
    return NextResponse.json(
      { error: "Entry not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ message: "Deleted." });
}
