export type DeliveryResult = {
  attempted: boolean;
  sent: boolean;
  skipped: boolean;
  reason?: string;
};

export type OrderItem = {
  productId?: string;
  name?: string;
  quantity?: number;
  price?: number | null;
};

export type OrderPayload = {
  id?: string;
  customerName?: string;
  phone?: string;
  email?: string;
  requestedDate?: string;
  requestedTime?: string;
  pickupOrDelivery?: "pickup" | "delivery";
  deliveryAddress?: string;
  notes?: string;
  specialInstructions?: string;
  eventType?: string;
  paymentMethod?: string;
  total?: number;
  items?: OrderItem[];
};

export function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function formatMoney(value: unknown) {
  const amount = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : "$0.00";
}

export function normalizePhone(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  const numeric = digits.replace(/\D/g, "");
  if (numeric.length === 10) return `+1${numeric}`;
  if (numeric.length === 11 && numeric.startsWith("1")) return `+${numeric}`;
  return trimmed;
}

export function buildOrderMessage(order: OrderPayload, businessName: string) {
  const lines: string[] = [];
  lines.push(`New order request for ${businessName}`);
  lines.push("");
  lines.push(`Order ID: ${clean(order.id) || "N/A"}`);
  lines.push(`Customer: ${clean(order.customerName) || "N/A"}`);
  lines.push(`Phone: ${clean(order.phone) || "N/A"}`);
  lines.push(`Email: ${clean(order.email) || "N/A"}`);
  lines.push(`Date needed: ${clean(order.requestedDate) || "N/A"}`);
  lines.push(`Time needed: ${clean(order.requestedTime) || "N/A"}`);
  lines.push(`Method: ${clean(order.pickupOrDelivery) || "N/A"}`);
  if (clean(order.deliveryAddress)) lines.push(`Delivery address: ${clean(order.deliveryAddress)}`);
  if (clean(order.eventType)) lines.push(`Event type: ${clean(order.eventType)}`);
  if (clean(order.paymentMethod)) lines.push(`Payment method: ${clean(order.paymentMethod)}`);
  lines.push(`Total: ${formatMoney(order.total)}`);
  lines.push("");
  lines.push("Items:");
  if (Array.isArray(order.items) && order.items.length > 0) {
    for (const item of order.items) {
      const quantity = typeof item.quantity === "number" ? item.quantity : 0;
      const name = clean(item.name) || "Item";
      const lineTotal =
        typeof item.price === "number" ? ` (${formatMoney(item.price * quantity)})` : "";
      lines.push(`- ${quantity} x ${name}${lineTotal}`);
    }
  } else {
    lines.push("- No items provided");
  }
  if (clean(order.specialInstructions)) {
    lines.push("");
    lines.push(`Special instructions: ${clean(order.specialInstructions)}`);
  }
  if (clean(order.notes)) lines.push(`Notes: ${clean(order.notes)}`);
  return lines.join("\n");
}

export function emailProviderStatus() {
  const apiKey = !!process.env["RESEND_API_KEY"];
  const from = !!(process.env["ORDER_FROM_EMAIL"] || process.env["RESEND_FROM_EMAIL"]);
  const to = !!process.env["ORDER_NOTIFICATION_EMAIL"];
  return {
    configured: apiKey && from && to,
    apiKeyConfigured: apiKey,
    fromConfigured: from,
    destinationConfigured: to,
    missing: [
      ...(apiKey ? [] : ["RESEND_API_KEY"]),
      ...(from ? [] : ["ORDER_FROM_EMAIL"]),
      ...(to ? [] : ["ORDER_NOTIFICATION_EMAIL"]),
    ],
  };
}

export function smsProviderStatus() {
  const sid = !!process.env["TWILIO_ACCOUNT_SID"];
  const tok = !!process.env["TWILIO_AUTH_TOKEN"];
  const from = !!process.env["TWILIO_FROM_PHONE"];
  const to = !!process.env["ORDER_NOTIFICATION_PHONE"];
  return {
    configured: sid && tok && from && to,
    accountConfigured: sid,
    tokenConfigured: tok,
    fromConfigured: from,
    destinationConfigured: to,
    missing: [
      ...(sid ? [] : ["TWILIO_ACCOUNT_SID"]),
      ...(tok ? [] : ["TWILIO_AUTH_TOKEN"]),
      ...(from ? [] : ["TWILIO_FROM_PHONE"]),
      ...(to ? [] : ["ORDER_NOTIFICATION_PHONE"]),
    ],
  };
}

export async function sendResendEmail(
  to: string,
  subject: string,
  text: string,
): Promise<DeliveryResult> {
  if (!to) {
    return { attempted: false, sent: false, skipped: true, reason: "No destination email." };
  }
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    return { attempted: false, sent: false, skipped: true, reason: "RESEND_API_KEY not set." };
  }
  const from =
    process.env["ORDER_FROM_EMAIL"] ||
    process.env["RESEND_FROM_EMAIL"] ||
    "Candy Crackzzz <onboarding@resend.dev>";
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, text }),
    });
    if (!response.ok) {
      const reason = await response.text();
      return { attempted: true, sent: false, skipped: false, reason };
    }
    return { attempted: true, sent: true, skipped: false };
  } catch (error) {
    return {
      attempted: true,
      sent: false,
      skipped: false,
      reason: error instanceof Error ? error.message : "Email request failed.",
    };
  }
}

export async function sendTwilioSms(to: string, body: string): Promise<DeliveryResult> {
  if (!to) {
    return { attempted: false, sent: false, skipped: true, reason: "No destination phone." };
  }
  const accountSid = process.env["TWILIO_ACCOUNT_SID"];
  const authToken = process.env["TWILIO_AUTH_TOKEN"];
  const from = normalizePhone(process.env["TWILIO_FROM_PHONE"] || "");
  if (!accountSid || !authToken || !from) {
    return {
      attempted: false,
      sent: false,
      skipped: true,
      reason: "Twilio is not fully configured.",
    };
  }
  const toPhone = normalizePhone(to);
  const form = new URLSearchParams({
    To: toPhone,
    From: from,
    Body: body,
  });
  if (process.env["TWILIO_MESSAGING_SERVICE_SID"]) {
    form.set("MessagingServiceSid", process.env["TWILIO_MESSAGING_SERVICE_SID"]);
    form.delete("From");
  }
  try {
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      },
    );
    if (!response.ok) {
      const reason = await response.text();
      return { attempted: true, sent: false, skipped: false, reason };
    }
    return { attempted: true, sent: true, skipped: false };
  } catch (error) {
    return {
      attempted: true,
      sent: false,
      skipped: false,
      reason: error instanceof Error ? error.message : "SMS request failed.",
    };
  }
}
