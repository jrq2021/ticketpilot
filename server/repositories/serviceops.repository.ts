import type {
  ActionDraft,
  AgentRecommendation,
  Customer,
  KnowledgeDoc,
  Product,
  ServiceOpsStore,
  Ticket,
  WarrantyPolicy,
} from "../../types/serviceops.ts";

export interface ServiceOpsRepository {
  /** 获取完整数据快照（兼容现有 domain 函数） */
  getStoreSnapshot(): Promise<ServiceOpsStore>;

  // Tickets
  listTickets(): Promise<Ticket[]>;
  getTicketById(id: string): Promise<Ticket | undefined>;
  updateTicket(ticket: Ticket): Promise<void>;

  // Customers
  listCustomers(): Promise<Customer[]>;

  // Products
  listProducts(): Promise<Product[]>;

  // Warranty Policies
  listWarrantyPolicies(): Promise<WarrantyPolicy[]>;

  // Knowledge Docs
  listKnowledgeDocs(): Promise<KnowledgeDoc[]>;

  // Recommendations
  listRecommendations(): Promise<AgentRecommendation[]>;
  getRecommendationByTicketId(
    ticketId: string,
  ): Promise<AgentRecommendation | undefined>;
  upsertRecommendation(rec: AgentRecommendation): Promise<void>;

  // Action Drafts
  listActionDrafts(): Promise<ActionDraft[]>;
  getActionDraftByTicketId(ticketId: string): Promise<ActionDraft | undefined>;
  upsertActionDraft(draft: ActionDraft): Promise<void>;
}
