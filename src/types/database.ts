export type Database = {
  public: {
    Tables: {
      research_runs: {
        Insert: any;
        Row: any;
        Update: any;
      };
      research_items: {
        Insert: any;
        Row: any;
        Update: any;
      };
      requests: {
        Row: any;
        Insert: any;
        Update: any;
      };
      request_preferences: {
        Row: any;
        Insert: any;
        Update: any;
      };
      request_status_history: {
        Row: any;
        Insert: any;
        Update: any;
      };
      report_option_snapshots: {
        Row: any;
        Insert: any;
        Update: any;
      };
      customers: {
        Row: any;
        Insert: any;
        Update: any;
      };
      staff_members: {
        Row: any;
        Insert: any;
        Update: any;
      };
    };
    Views: {
      v_request_ui_status: {
        Row: any;
      };
      v_request_timeline: {
        Row: any;
      };
    };
  };
};
