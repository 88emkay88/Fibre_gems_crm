export type CustomerStatus =
  | "new_lead"
  | "contacted"
  | "qualified"
  | "order_submitted"
  | "payment_pending"
  | "activation_pending"
  | "activated"
  | "lost";

export type Customer = {
  id: string;
  external_customer_id?: string | null;
  full_name: string;
  first_name: string;
  surname: string;
  cell_number: string;
  alternate_cell_number?: string | null;
  email?: string | null;
  full_address?: string | null;
  area_suburb?: string | null;
  product_package?: string | null;
  payment_type?: string | null;
  status: CustomerStatus | string;
  owner_id: string;
  original_agent_id?: string | null;
  created_by?: string | null;
  next_action?: string | null;
  next_action_date?: string | null;
  last_contact_date?: string | null;
  easypay_number?: string | null;
  easypay_cycle?: string | number | null;
  easypay_expiry?: string | null;
  easypay_expiry_date?: string | null;
  order_number?: string | null;
  ovr_number?: string | null;
  ovk_number?: string | null;
  referral_code?: string | null;
  escalation_flag?: boolean | null;
  escalation_level?: string | null;
  escalation_reason?: string | null;
  created_at: string;
};

export type ActivityRow = {
  id: string;
  customer_id: string;
  actor_id: string;
  action_type: string;
  outcome?: string | null;
  notes?: string | null;
  customer_status_after?: string | null;
  next_action?: string | null;
  next_action_date?: string | null;
  escalation_type?: string | null;
  escalation_reason?: string | null;
  recording_url?: string | null;
  created_at: string;
};

export const PRODUCT_PACKAGES = [
  "Vuma Reach 10Mbps/10Mbps",
  "Vuma Reach 20Mbps/10Mbps",
  "Vuma Reach 50Mbps/25Mbps",
  "Vuma Reach 100Mbps/50Mbps",
] as const;

export type CallProgressStatus =
  | "dialing"
  | "ringing"
  | "connected"
  | "does_not_exist"
  | "busy"
  | "hung_up";

export type AgentTelephonyState = {
  agentStatus: "ready" | "paused" | "in_call" | "dialing";
  callProgress?: CallProgressStatus | null;
  callErrorReason?: string | null;
  pauseCode?: string | null;
  activeCustomerId?: string | null;
  activeCustomerName?: string | null;
  activeCustomerPhone?: string | null;
  callDurationSeconds: number;
  isMuted: boolean;
  isOnHold: boolean;
  viciLeadId?: string | null;
  outcomeLoggedForCall?: boolean;
};
