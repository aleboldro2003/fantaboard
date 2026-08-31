export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      auction_teams: {
        Row: {
          id: number;
          user_id: string;
          name: string;
          initial_budget: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: never;
          user_id: string;
          name: string;
          initial_budget?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: never;
          user_id?: string;
          name?: string;
          initial_budget?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      auction_purchases: {
        Row: {
          id: number;
          auction_team_id: number;
          user_id: string;
          player_id: number;
          player_name: string;
          player_team: string;
          player_role: string;
          price: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: never;
          auction_team_id: number;
          user_id: string;
          player_id: number;
          player_name: string;
          player_team: string;
          player_role: string;
          price: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: never;
          auction_team_id?: number;
          user_id?: string;
          player_id?: number;
          player_name?: string;
          player_team?: string;
          player_role?: string;
          price?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'auction_purchases_auction_team_id_fkey';
            columns: ['auction_team_id'];
            isOneToOne: false;
            referencedRelation: 'auction_teams';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type AuctionTeam = Database['public']['Tables']['auction_teams']['Row'];
export type AuctionPurchase = Database['public']['Tables']['auction_purchases']['Row'];
