import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { auth } from "@/server/auth";
import { env } from "@/lib/env";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const key_id = env().RAZORPAY_KEY_ID;
    const key_secret = env().RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
      return NextResponse.json({ error: "Razorpay not configured" }, { status: 500 });
    }

    const instance = new Razorpay({
      key_id,
      key_secret,
    });

    const options = {
      amount: 18000, // 180 INR in paise
      currency: "INR",
      receipt: `receipt_flash_${userId.slice(0, 8)}_${Date.now()}`,
    };

    const order = await instance.orders.create(options);

    return NextResponse.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: key_id,
    });
  } catch (err) {
    console.error("Razorpay order error:", err);
    return NextResponse.json({ error: "order_creation_failed" }, { status: 500 });
  }
}
