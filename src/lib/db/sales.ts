/**
 * Sales in the new schema.
 *
 *   orders + order_items   one row per sale and per line
 *   create_order()         saves the sale, its lines, the stock change, any
 *                          reward code and the member's points in one step
 */
import { supabase } from "@/config/supabase";

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export interface OrderLine {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  customerName: string;
  patientId: string | null;
  items: OrderLine[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string | null;
  pointsEarned: number;
  createdAt: string;
}

export async function listOrders(practiceId: string): Promise<OrderSummary[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, patient_id, subtotal, discount, total, payment_method, created_at, " +
        "patient:patients(full_name), order_items(product_id, description, quantity, unit_price), " +
        "points_ledger(delta)"
    )
    .eq("practice_id", practiceId)
    .order("created_at", { ascending: false });
  check(error);
  return (data ?? []).map((o: any) => {
    const patient = Array.isArray(o.patient) ? o.patient[0] : o.patient;
    return {
      id: o.id,
      orderNumber: o.order_number,
      customerName: patient?.full_name ?? "Walk-in customer",
      patientId: o.patient_id,
      items: (o.order_items ?? []).map((i: any) => ({
        productId: i.product_id,
        name: i.description,
        quantity: i.quantity,
        price: Number(i.unit_price),
      })),
      subtotal: Number(o.subtotal),
      discount: Number(o.discount),
      total: Number(o.total),
      paymentMethod: o.payment_method,
      pointsEarned: (o.points_ledger ?? []).reduce((s: number, l: any) => s + (l.delta > 0 ? l.delta : 0), 0),
      createdAt: o.created_at,
    };
  });
}

/** The form's payment choices -> the database's payment_method values. */
const PAYMENT: Record<string, string> = { credit_card: "card", card: "card", cash: "cash", eft: "eft" };

export async function createOrder(
  practiceId: string,
  sale: { patientId?: string | null; items: { productId: string; quantity: number }[]; paymentMethod?: string; rewardCode?: string }
) {
  const { data, error } = await supabase.rpc("create_order", {
    p_practice_id: practiceId,
    p_patient_id: sale.patientId || null,
    p_items: sale.items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
    p_payment_method: PAYMENT[sale.paymentMethod ?? "cash"] ?? "other",
    p_reward_code: sale.rewardCode?.trim() || null,
  });
  check(error);
  const row = (data ?? [])[0];
  return {
    orderId: row.order_id as string,
    orderNumber: row.order_number as string,
    total: Number(row.total),
    pointsAwarded: Number(row.points_awarded),
  };
}
