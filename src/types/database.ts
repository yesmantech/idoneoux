
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string | null;
          is_featured: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          description?: string | null;
          is_featured?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          description?: string | null;
          is_featured?: boolean;
          created_at?: string;
        };
      };
      roles: {
        Row: {
          id: string;
          category_id: string;
          slug: string;
          title: string;
          order_index: number;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          slug: string;
          title: string;
          order_index?: number;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          slug?: string;
          title?: string;
          order_index?: number;
          description?: string | null;
          created_at?: string;
        };
      };
      quizzes: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          category: string | null;
          time_limit: number | null;
          points_correct: number | null;
          points_wrong: number | null;
          points_blank: number | null;
          total_questions: number | null;
          year: number | null;
          is_archived: boolean;
          official_non_navigable: boolean;
          // New fields
          role_id: string | null;
          slug: string | null;
          is_official: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          role_id?: string | null;
          slug?: string | null;
          year?: number | null;
          [key: string]: any; // Allow other optional fields
        };
        Update: {
          [key: string]: any;
        };
      };
      subjects: {
        Row: {
          id: string;
          quiz_id: string | null;
          name: string;
          code: string | null;
          description: string | null;
          is_archived: boolean;
          created_at: string;
        };
        Insert: any;
        Update: any;
      };
      questions: {
        Row: {
          id: string;
          quiz_id: string | null;
          subject_id: string | null;
          text: string | null;
          option_a: string | null;
          option_b: string | null;
          option_c: string | null;
          option_d: string | null;
          correct_option: string | null;
          image_url: string | null;
          is_archived: boolean;
          created_at: string;
        };
        Insert: any;
        Update: any;
      };
      quiz_subject_rules: {
        Row: {
          id: string;
          quiz_id: string;
          subject_id: string;
          question_count: number;
          created_at: string;
        };
        Insert: any;
        Update: any;
      };
      quiz_attempts: {
        Row: {
          id: string;
          quiz_id: string;
          user_id: string;
          score: number;
          answers: Json;
          started_at: string | null;
          finished_at: string | null;
          duration_seconds: number | null;
          total_questions: number | null;
          correct: number | null;
          wrong: number | null;
          blank: number | null;
          created_at: string;
        };
        Insert: any;
        Update: any;
      };
    };
  };
}
