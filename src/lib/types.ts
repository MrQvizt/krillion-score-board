/** Hand-written database types matching supabase/migrations. All objects are prefixed krillion_ because the Supabase project is shared with other apps. */

export type Profile = {
  id: string;
  /** The nick, shown everywhere. */
  display_name: string;
  /** Real name, shown on hover over the nick. Admins fill it in for older accounts. */
  full_name: string | null;
  is_admin: boolean;
  created_at: string;
};

export type Board = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  created_by: string | null;
  created_at: string;
};

export type BoardMember = {
  board_id: string;
  user_id: string;
  added_at: string;
};

export type Score = {
  id: string;
  user_id: string;
  played_on: string;
  score: number;
  note: string;
  created_at: string;
  updated_at: string;
};

export type AdminUser = {
  id: string;
  display_name: string;
  full_name: string | null;
  email: string;
  is_admin: boolean;
  created_at: string;
};

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      krillion_profiles: Table<
        Profile,
        { id: string; display_name: string; full_name?: string | null; is_admin?: boolean; created_at?: string },
        Partial<Profile>
      >;
      krillion_boards: Table<
        Board,
        {
          id?: string;
          name: string;
          description?: string;
          emoji?: string;
          created_by?: string | null;
          created_at?: string;
        },
        Partial<Board>
      >;
      krillion_board_members: Table<
        BoardMember,
        { board_id: string; user_id: string; added_at?: string },
        Partial<BoardMember>
      >;
      krillion_scores: Table<
        Score,
        {
          id?: string;
          user_id: string;
          played_on: string;
          score: number;
          note?: string;
          created_at?: string;
          updated_at?: string;
        },
        Partial<Score>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      krillion_is_admin: { Args: Record<string, never>; Returns: boolean };
      krillion_is_board_member: { Args: { target_board: string }; Returns: boolean };
      krillion_shares_board_with: { Args: { target_user: string }; Returns: boolean };
      krillion_ensure_profile: {
        Args: { p_display_name?: string | null; p_full_name?: string | null };
        Returns: Profile;
      };
      krillion_admin_list_users: { Args: Record<string, never>; Returns: AdminUser[] };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
