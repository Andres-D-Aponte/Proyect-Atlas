export interface Client {
  id: number;
  companyId: number;
  name: string;
  phone: string;
  email: string | null;
  document: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ClientTimelineEventType = 'CREATED' | 'UPDATED';

export interface ClientTimelineEvent {
  id: number;
  clientId: number;
  type: ClientTimelineEventType;
  description: string;
  createdAt: string;
}

export interface ClientDraft {
  name: string;
  phone: string;
  email: string;
  document: string;
  address: string;
  notes: string;
}

export function emptyClientDraft(): ClientDraft {
  return { name: '', phone: '', email: '', document: '', address: '', notes: '' };
}

export function draftFromClient(client: Client): ClientDraft {
  return {
    name: client.name,
    phone: client.phone,
    email: client.email ?? '',
    document: client.document ?? '',
    address: client.address ?? '',
    notes: client.notes ?? '',
  };
}
