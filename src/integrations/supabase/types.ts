export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: string | null
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: string | null
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: string | null
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      authors: {
        Row: {
          bio: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      book_authors: {
        Row: {
          author_id: string
          book_id: string
        }
        Insert: {
          author_id: string
          book_id: string
        }
        Update: {
          author_id?: string
          book_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_authors_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_authors_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_authors_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      book_copies: {
        Row: {
          accession_no: string
          book_id: string
          created_at: string
          id: string
          status: string
        }
        Insert: {
          accession_no?: string
          book_id: string
          created_at?: string
          id?: string
          status?: string
        }
        Update: {
          accession_no?: string
          book_id?: string
          created_at?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_copies_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_copies_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          book_no: number
          category_id: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          edition: string | null
          id: string
          isbn: string
          language: string | null
          publication_year: number | null
          publisher_id: string | null
          rack: string | null
          shelf: string | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          book_no?: never
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          edition?: string | null
          id?: string
          isbn: string
          language?: string | null
          publication_year?: number | null
          publisher_id?: string | null
          rack?: string | null
          shelf?: string | null
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          book_no?: never
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          edition?: string | null
          id?: string
          isbn?: string
          language?: string | null
          publication_year?: number | null
          publisher_id?: string | null
          rack?: string | null
          shelf?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "books_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "books_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "books_publisher_id_fkey"
            columns: ["publisher_id"]
            isOneToOne: false
            referencedRelation: "publishers"
            referencedColumns: ["id"]
          },
        ]
      }
      borrowing_transactions: {
        Row: {
          book_id: string
          copy_id: string
          created_at: string
          due_date: string
          fine_amount: number
          id: string
          issue_date: string
          issued_by: string | null
          overdue_days: number
          return_date: string | null
          returned_at: string | null
          returned_to: string | null
          status: string
          student_id: string
          txn_no: number
        }
        Insert: {
          book_id: string
          copy_id: string
          created_at?: string
          due_date: string
          fine_amount?: number
          id?: string
          issue_date?: string
          issued_by?: string | null
          overdue_days?: number
          return_date?: string | null
          returned_at?: string | null
          returned_to?: string | null
          status?: string
          student_id: string
          txn_no?: never
        }
        Update: {
          book_id?: string
          copy_id?: string
          created_at?: string
          due_date?: string
          fine_amount?: number
          id?: string
          issue_date?: string
          issued_by?: string | null
          overdue_days?: number
          return_date?: string | null
          returned_at?: string | null
          returned_to?: string | null
          status?: string
          student_id?: string
          txn_no?: never
        }
        Relationships: [
          {
            foreignKeyName: "borrowing_transactions_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrowing_transactions_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrowing_transactions_copy_id_fkey"
            columns: ["copy_id"]
            isOneToOne: false
            referencedRelation: "book_copies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrowing_transactions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      fine_payments: {
        Row: {
          amount: number
          client_ref: string | null
          created_at: string
          fine_id: string
          id: string
          kind: string
          method: string | null
          note: string | null
          receipt_no: number
          recorded_by: string | null
          reverses_payment_id: string | null
        }
        Insert: {
          amount: number
          client_ref?: string | null
          created_at?: string
          fine_id: string
          id?: string
          kind?: string
          method?: string | null
          note?: string | null
          receipt_no?: never
          recorded_by?: string | null
          reverses_payment_id?: string | null
        }
        Update: {
          amount?: number
          client_ref?: string | null
          created_at?: string
          fine_id?: string
          id?: string
          kind?: string
          method?: string | null
          note?: string | null
          receipt_no?: never
          recorded_by?: string | null
          reverses_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fine_payments_fine_id_fkey"
            columns: ["fine_id"]
            isOneToOne: false
            referencedRelation: "fines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fine_payments_fine_id_fkey"
            columns: ["fine_id"]
            isOneToOne: false
            referencedRelation: "fines_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fine_payments_reverses_payment_id_fkey"
            columns: ["reverses_payment_id"]
            isOneToOne: true
            referencedRelation: "fine_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      fines: {
        Row: {
          amount: number
          amount_paid: number
          created_at: string
          fine_no: number
          id: string
          overdue_days: number
          status: string
          student_id: string
          transaction_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          amount_paid?: number
          created_at?: string
          fine_no?: never
          id?: string
          overdue_days: number
          status?: string
          student_id: string
          transaction_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_paid?: number
          created_at?: string
          fine_no?: never
          id?: string
          overdue_days?: number
          status?: string
          student_id?: string
          transaction_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fines_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fines_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "borrowing_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fines_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions_view"
            referencedColumns: ["id"]
          },
        ]
      }
      librarians: {
        Row: {
          created_at: string
          employee_id: string | null
          id: string
          is_active: boolean
          phone: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          employee_id?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      library_settings: {
        Row: {
          fine_per_day: number
          id: number
          library_name: string
          loan_days: number
          max_books: number
          reservation_hold_days: number
          updated_at: string
        }
        Insert: {
          fine_per_day?: number
          id?: number
          library_name?: string
          loan_days?: number
          max_books?: number
          reservation_hold_days?: number
          updated_at?: string
        }
        Update: {
          fine_per_day?: number
          id?: number
          library_name?: string
          loan_days?: number
          max_books?: number
          reservation_hold_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          dedupe_key: string | null
          id: string
          is_read: boolean
          kind: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: string
          is_read?: boolean
          kind?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: string
          is_read?: boolean
          kind?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      publishers: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          book_id: string
          created_at: string
          expires_at: string | null
          id: string
          ready_at: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          book_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          ready_at?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          book_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          ready_at?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          academic_year: string | null
          course: string | null
          created_at: string
          department: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          register_no: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          academic_year?: string | null
          course?: string | null
          created_at?: string
          department?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          phone?: string | null
          register_no?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          academic_year?: string | null
          course?: string | null
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          register_no?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      books_catalog: {
        Row: {
          author_names: string | null
          available_copies: number | null
          book_no: number | null
          category_id: string | null
          category_name: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          edition: string | null
          id: string | null
          isbn: string | null
          issued_copies: number | null
          language: string | null
          publication_year: number | null
          publisher_id: string | null
          publisher_name: string | null
          rack: string | null
          shelf: string | null
          subtitle: string | null
          title: string | null
          total_copies: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "books_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "books_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "books_publisher_id_fkey"
            columns: ["publisher_id"]
            isOneToOne: false
            referencedRelation: "publishers"
            referencedColumns: ["id"]
          },
        ]
      }
      categories_view: {
        Row: {
          book_count: number | null
          created_at: string | null
          description: string | null
          id: string | null
          name: string | null
        }
        Insert: {
          book_count?: never
          created_at?: string | null
          description?: string | null
          id?: string | null
          name?: string | null
        }
        Update: {
          book_count?: never
          created_at?: string | null
          description?: string | null
          id?: string | null
          name?: string | null
        }
        Relationships: []
      }
      fines_view: {
        Row: {
          amount: number | null
          amount_paid: number | null
          book_title: string | null
          created_at: string | null
          department: string | null
          due_date: string | null
          fine_no: number | null
          id: string | null
          outstanding: number | null
          overdue_days: number | null
          register_no: string | null
          return_date: string | null
          status: string | null
          student_id: string | null
          student_name: string | null
          transaction_id: string | null
          txn_no: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fines_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fines_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "borrowing_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fines_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions_view"
            referencedColumns: ["id"]
          },
        ]
      }
      librarians_view: {
        Row: {
          created_at: string | null
          email: string | null
          employee_id: string | null
          full_name: string | null
          id: string | null
          is_active: boolean | null
          issued_count: number | null
          phone: string | null
          returned_count: number | null
          user_id: string | null
        }
        Relationships: []
      }
      reservations_view: {
        Row: {
          book_id: string | null
          book_title: string | null
          created_at: string | null
          expires_at: string | null
          id: string | null
          queue_position: number | null
          ready_at: string | null
          register_no: string | null
          status: string | null
          student_id: string | null
          student_name: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions_view: {
        Row: {
          accession_no: string | null
          book_id: string | null
          book_title: string | null
          copy_id: string | null
          created_at: string | null
          days_late: number | null
          department: string | null
          due_date: string | null
          fine_amount: number | null
          id: string | null
          is_overdue: boolean | null
          isbn: string | null
          issue_date: string | null
          issued_by: string | null
          overdue_days: number | null
          register_no: string | null
          return_date: string | null
          returned_at: string | null
          returned_to: string | null
          status: string | null
          student_email: string | null
          student_id: string | null
          student_name: string | null
          txn_no: number | null
        }
        Relationships: [
          {
            foreignKeyName: "borrowing_transactions_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrowing_transactions_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrowing_transactions_copy_id_fkey"
            columns: ["copy_id"]
            isOneToOne: false
            referencedRelation: "book_copies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrowing_transactions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cancel_reservation: { Args: { p_id: string }; Returns: undefined }
      circulation_monthly: {
        Args: { p_months?: number }
        Returns: {
          issued: number
          month: string
          returned: number
        }[]
      }
      dashboard_stats: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _uid: string }; Returns: boolean }
      issue_book: {
        Args: { p_copy: string; p_student: string }
        Returns: string
      }
      log_activity: {
        Args: {
          _action: string
          _details: string
          _entity: string
          _id: string
        }
        Returns: undefined
      }
      mark_reservation_ready: { Args: { p_id: string }; Returns: undefined }
      my_student_id: { Args: never; Returns: string }
      notify_user: {
        Args: {
          _body: string
          _key: string
          _kind: string
          _title: string
          _uid: string
        }
        Returns: undefined
      }
      process_library_jobs: { Args: never; Returns: Json }
      promote_reservation: { Args: { p_book: string }; Returns: undefined }
      record_fine_payment: {
        Args: {
          p_amount: number
          p_fine: string
          p_method: string
          p_note: string
          p_ref: string
        }
        Returns: string
      }
      reserve_book: { Args: { p_book: string }; Returns: string }
      return_book: { Args: { p_lost?: boolean; p_tx: string }; Returns: Json }
      reverse_fine_payment: {
        Args: { p_payment: string; p_reason: string }
        Returns: string
      }
      set_librarian: {
        Args: { p_email: string; p_employee_id: string; p_phone: string }
        Returns: string
      }
      top_books: {
        Args: { p_from?: string; p_limit?: number; p_to?: string }
        Returns: {
          author_names: string
          book_id: string
          borrow_count: number
          title: string
        }[]
      }
      update_my_profile: {
        Args: { p_full_name: string; p_phone: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "librarian" | "student"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "librarian", "student"],
    },
  },
} as const
