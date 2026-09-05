export interface NotificationPayload {
  to: string; // phone number, email address, or userId
  title?: string;
  body: string;
  metadata?: any;
}

export interface NotificationProvider {
  send(payload: NotificationPayload): Promise<boolean>;
}
