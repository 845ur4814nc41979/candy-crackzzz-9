import { Router, type Request, type Response } from "express";
import {
  buildOrderMessage,
  clean,
  sendResendEmail,
  sendTwilioSms,
  type OrderPayload,
} from "./candy-notify";

const router = Router();

type NotificationRequestBody = {
  businessName?: string;
  toEmail?: string;
  toPhone?: string;
  order?: OrderPayload;
};

function isTestModeEnabled() {
  return (
    process.env["ALLOW_TEST_ORDERS"] === "true" || process.env["NODE_ENV"] !== "production"
  );
}

router.post("/notifications/order", async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as NotificationRequestBody;
    const order = body.order;

    if (
      !order ||
      !clean(order.customerName) ||
      !Array.isArray(order.items) ||
      order.items.length === 0
    ) {
      return res
        .status(400)
        .json({ ok: false, accepted: false, message: "Order details are missing or invalid." });
    }

    const businessName =
      clean(body.businessName) || clean(process.env["BUSINESS_NAME"]) || "Candy Crackzzz";
    const destinationEmail =
      clean(process.env["ORDER_NOTIFICATION_EMAIL"]) || clean(body.toEmail);
    const destinationPhone =
      clean(process.env["ORDER_NOTIFICATION_PHONE"]) || clean(body.toPhone);

    const subject = `New order request - ${clean(order.customerName) || "Customer"}`;
    const text = buildOrderMessage(order, businessName);

    const [emailResult, smsResult] = await Promise.all([
      sendResendEmail(destinationEmail, subject, text),
      sendTwilioSms(destinationPhone, text),
    ]);

    const accepted = emailResult.sent || smsResult.sent;

    if (accepted) {
      return res
        .status(200)
        .json({ ok: true, accepted: true, email: emailResult, sms: smsResult, message: "Notification sent." });
    }

    if (isTestModeEnabled()) {
      console.log("[test-order-preview]\n" + text);
      return res.status(200).json({
        ok: true,
        accepted: true,
        testMode: true,
        email: emailResult,
        sms: smsResult,
        message: "Accepted in test mode. No live notification provider is configured yet.",
      });
    }

    return res.status(200).json({
      ok: true,
      accepted: true,
      email: emailResult,
      sms: smsResult,
      message:
        "Order saved. Email/SMS alerts are not configured yet — add provider secrets to receive them.",
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ ok: false, accepted: false, message: reason });
  }
});

export default router;
