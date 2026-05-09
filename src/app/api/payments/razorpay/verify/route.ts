import { NextResponse } from "next/server";
import crypto from "crypto";
import { env } from "@/lib/env";
import { auth } from "@/server/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    const secret = env().RAZORPAY_KEY_SECRET;
    if (!secret) return NextResponse.json({ error: "Razorpay not configured" }, { status: 500 });

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
    }
  } catch (err) {
    console.error("Razorpay verification error:", err);
    return NextResponse.json({ error: "verification_failed" }, { status: 500 });
  }
}
