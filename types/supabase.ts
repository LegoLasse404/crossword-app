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
      crosswords: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          layout: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          layout?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string | null;
          layout?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      crossword_clues: {
        Row: {
          id: string;
          crossword_id: string;
          hint: string;
          word: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          crossword_id: string;
          hint: string;
          word: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          crossword_id?: string;
          hint?: string;
          word?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "crossword_clues_crossword_id_fkey";
            columns: ["crossword_id"];
            isOneToOne: false;
            referencedRelation: "crosswords";
            referencedColumns: ["id"];
          },
        ];
      };
      crossword_shares: {
        Row: {
          id: string;
          crossword_id: string;
          shared_with_user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          crossword_id: string;
          shared_with_user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          crossword_id?: string;
          shared_with_user_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "crossword_shares_crossword_id_fkey";
            columns: ["crossword_id"];
            isOneToOne: false;
            referencedRelation: "crosswords";
            referencedColumns: ["id"];
          },
        ];
      };
      friend_requests: {
        Row: {
          id: string;
          from_user_id: string;
          to_user_id: string;
          status: string;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          from_user_id: string;
          to_user_id: string;
          status: string;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          from_user_id?: string;
          to_user_id?: string;
          status?: string;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      friendships: {
        Row: {
          id: string;
          user_id: string;
          friend_id: string;
          status: string;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          friend_id: string;
          status: string;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          friend_id?: string;
          status?: string;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      user_profiles: {
        Row: {
          id: string;
          email: string;
          username: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          username?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
