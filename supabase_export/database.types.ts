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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      app_campaign_events: {
        Row: {
          campaign_id: string | null
          created_at: string
          event_name: string
          event_source: string
          id: string
          metadata: Json
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          event_name: string
          event_source?: string
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          event_name?: string
          event_source?: string
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_campaign_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "app_promo_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      app_promo_campaigns: {
        Row: {
          audience_rules: Json
          code: string
          cooldown_hours: number
          created_at: string
          cta_action: string | null
          cta_label: string | null
          description: string
          discount_type: string
          discount_value: number
          eligible_destinations: string[]
          eligible_origins: string[]
          end_at: string | null
          ends_at: string | null
          first_time_only: boolean
          first_trip_only: boolean
          global_limit: number | null
          highlight_enabled: boolean
          id: string
          is_active: boolean
          max_discount: number | null
          max_discount_amount: number | null
          message: string | null
          metadata: Json
          min_booking_amount: number
          notification_body: string | null
          notification_enabled: boolean
          notification_title: string | null
          per_user_limit: number
          popup_cooldown_hours: number
          popup_enabled: boolean
          popup_priority: number
          priority: number
          start_at: string | null
          starts_at: string | null
          title: string
          trigger_kind: string
          updated_at: string
        }
        Insert: {
          audience_rules?: Json
          code: string
          cooldown_hours?: number
          created_at?: string
          cta_action?: string | null
          cta_label?: string | null
          description?: string
          discount_type: string
          discount_value: number
          eligible_destinations?: string[]
          eligible_origins?: string[]
          end_at?: string | null
          ends_at?: string | null
          first_time_only?: boolean
          first_trip_only?: boolean
          global_limit?: number | null
          highlight_enabled?: boolean
          id?: string
          is_active?: boolean
          max_discount?: number | null
          max_discount_amount?: number | null
          message?: string | null
          metadata?: Json
          min_booking_amount?: number
          notification_body?: string | null
          notification_enabled?: boolean
          notification_title?: string | null
          per_user_limit?: number
          popup_cooldown_hours?: number
          popup_enabled?: boolean
          popup_priority?: number
          priority?: number
          start_at?: string | null
          starts_at?: string | null
          title: string
          trigger_kind?: string
          updated_at?: string
        }
        Update: {
          audience_rules?: Json
          code?: string
          cooldown_hours?: number
          created_at?: string
          cta_action?: string | null
          cta_label?: string | null
          description?: string
          discount_type?: string
          discount_value?: number
          eligible_destinations?: string[]
          eligible_origins?: string[]
          end_at?: string | null
          ends_at?: string | null
          first_time_only?: boolean
          first_trip_only?: boolean
          global_limit?: number | null
          highlight_enabled?: boolean
          id?: string
          is_active?: boolean
          max_discount?: number | null
          max_discount_amount?: number | null
          message?: string | null
          metadata?: Json
          min_booking_amount?: number
          notification_body?: string | null
          notification_enabled?: boolean
          notification_title?: string | null
          per_user_limit?: number
          popup_cooldown_hours?: number
          popup_enabled?: boolean
          popup_priority?: number
          priority?: number
          start_at?: string | null
          starts_at?: string | null
          title?: string
          trigger_kind?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_promo_redemptions: {
        Row: {
          booking_amount: number
          booking_id: string | null
          booking_reference: string
          campaign_id: string
          code: string
          consumed_at: string
          created_at: string
          discount_amount: number
          id: string
          promo_code: string
          promo_id: string
          status: string
          trip_meta: Json
          user_id: string
        }
        Insert: {
          booking_amount?: number
          booking_id?: string | null
          booking_reference: string
          campaign_id: string
          code: string
          consumed_at?: string
          created_at?: string
          discount_amount?: number
          id?: string
          promo_code: string
          promo_id: string
          status?: string
          trip_meta?: Json
          user_id: string
        }
        Update: {
          booking_amount?: number
          booking_id?: string | null
          booking_reference?: string
          campaign_id?: string
          code?: string
          consumed_at?: string
          created_at?: string
          discount_amount?: number
          id?: string
          promo_code?: string
          promo_id?: string
          status?: string
          trip_meta?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_promo_redemptions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "app_promo_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_promo_redemptions_promo_id_fkey"
            columns: ["promo_id"]
            isOneToOne: false
            referencedRelation: "app_promo_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      app_promo_route_rules: {
        Row: {
          campaign_id: string
          created_at: string
          from_city: string
          id: number
          to_city: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          from_city: string
          id?: never
          to_city: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          from_city?: string
          id?: never
          to_city?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_promo_route_rules_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "app_promo_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      app_referral_claims: {
        Row: {
          applied_at: string
          created_at: string
          id: string
          qualified_at: string | null
          referral_code: string
          referred_user_id: string
          referrer_user_id: string
          reward_payload: Json
          rewarded_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          applied_at?: string
          created_at?: string
          id?: string
          qualified_at?: string | null
          referral_code: string
          referred_user_id: string
          referrer_user_id: string
          reward_payload?: Json
          rewarded_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          applied_at?: string
          created_at?: string
          id?: string
          qualified_at?: string | null
          referral_code?: string
          referred_user_id?: string
          referrer_user_id?: string
          reward_payload?: Json
          rewarded_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_referral_codes: {
        Row: {
          created_at: string
          referral_code: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          referral_code: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          referral_code?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_user_notifications: {
        Row: {
          body: string
          campaign_id: string | null
          category: string
          created_at: string
          cta_action: string | null
          cta_label: string | null
          dedupe_key: string | null
          delivered_at: string
          dismissed_at: string | null
          expires_at: string | null
          id: string
          payload: Json
          priority: number
          read_at: string | null
          source: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          campaign_id?: string | null
          category?: string
          created_at?: string
          cta_action?: string | null
          cta_label?: string | null
          dedupe_key?: string | null
          delivered_at?: string
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          payload?: Json
          priority?: number
          read_at?: string | null
          source?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          campaign_id?: string | null
          category?: string
          created_at?: string
          cta_action?: string | null
          cta_label?: string | null
          dedupe_key?: string | null
          delivered_at?: string
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          payload?: Json
          priority?: number
          read_at?: string | null
          source?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_user_notifications_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "app_promo_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      app_wallet_transactions: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          description: string
          id: string
          payload: Json
          payment_channel: string | null
          reference_id: string | null
          txn_date: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          description?: string
          id?: string
          payload?: Json
          payment_channel?: string | null
          reference_id?: string | null
          txn_date?: string | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          description?: string
          id?: string
          payload?: Json
          payment_channel?: string | null
          reference_id?: string | null
          txn_date?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          points: number
          subscription: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          points?: number
          subscription?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          points?: number
          subscription?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_confirmation_requests: {
        Row: {
          booking_ref: string | null
          created_at: string
          hold_token: string | null
          id: number
          idempotency_key: string
          request_payload: Json
          result_payload: Json | null
          trip_instance_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_ref?: string | null
          created_at?: string
          hold_token?: string | null
          id?: never
          idempotency_key: string
          request_payload?: Json
          result_payload?: Json | null
          trip_instance_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_ref?: string | null
          created_at?: string
          hold_token?: string | null
          id?: never
          idempotency_key?: string
          request_payload?: Json
          result_payload?: Json | null
          trip_instance_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      booking_passengers: {
        Row: {
          booking_id: string
          created_at: string
          fare_amount: number
          id: string
          passenger_index: number
          seat_number: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          fare_amount?: number
          id?: string
          passenger_index: number
          seat_number: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          fare_amount?: number
          id?: string
          passenger_index?: number
          seat_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_passengers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          access: boolean
          booking_date: string | null
          cancelled_at: string | null
          client_id: string | null
          created_at: string
          earned_points_pending: number
          final_total: number
          id: string
          luggage: boolean
          payment_method: string
          pnr: string
          points_awarded: boolean
          promo_campaign_id: string | null
          promo_code: string | null
          promo_discount: number
          promo_discount_amount: number
          qr_payload: string
          refund_amount: number | null
          refund_client_action_id: string | null
          ride: boolean
          selected_seats: Json
          status: string
          ticket_token: string | null
          trip_data: Json
          trip_instance_id: string | null
          trip_payload: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access?: boolean
          booking_date?: string | null
          cancelled_at?: string | null
          client_id?: string | null
          created_at?: string
          earned_points_pending?: number
          final_total?: number
          id?: string
          luggage?: boolean
          payment_method?: string
          pnr: string
          points_awarded?: boolean
          promo_campaign_id?: string | null
          promo_code?: string | null
          promo_discount?: number
          promo_discount_amount?: number
          qr_payload?: string
          refund_amount?: number | null
          refund_client_action_id?: string | null
          ride?: boolean
          selected_seats?: Json
          status: string
          ticket_token?: string | null
          trip_data?: Json
          trip_instance_id?: string | null
          trip_payload?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access?: boolean
          booking_date?: string | null
          cancelled_at?: string | null
          client_id?: string | null
          created_at?: string
          earned_points_pending?: number
          final_total?: number
          id?: string
          luggage?: boolean
          payment_method?: string
          pnr?: string
          points_awarded?: boolean
          promo_campaign_id?: string | null
          promo_code?: string | null
          promo_discount?: number
          promo_discount_amount?: number
          qr_payload?: string
          refund_amount?: number | null
          refund_client_action_id?: string | null
          ride?: boolean
          selected_seats?: Json
          status?: string
          ticket_token?: string | null
          trip_data?: Json
          trip_instance_id?: string | null
          trip_payload?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_trip_instance_id_fkey"
            columns: ["trip_instance_id"]
            isOneToOne: false
            referencedRelation: "trip_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          active: boolean
          code: string | null
          created_at: string
          id: string
          name_ar: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code?: string | null
          created_at?: string
          id?: string
          name_ar: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string | null
          created_at?: string
          id?: string
          name_ar?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string | null
          address_line1: string | null
          address_line2: string | null
          avatar_url: string | null
          city: string | null
          created_at: string
          deleted_at: string | null
          display_name: string
          emergency_phone: string | null
          first_app_open_at: string | null
          id: string
          last_app_open_at: string | null
          last_offer_popup_at: string | null
          onboarding_completed_at: string | null
          phone: string | null
          referral_code: string | null
          referred_by_code: string | null
          referred_by_user_id: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          account_status?: string | null
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name: string
          emergency_phone?: string | null
          first_app_open_at?: string | null
          id: string
          last_app_open_at?: string | null
          last_offer_popup_at?: string | null
          onboarding_completed_at?: string | null
          phone?: string | null
          referral_code?: string | null
          referred_by_code?: string | null
          referred_by_user_id?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          account_status?: string | null
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          emergency_phone?: string | null
          first_app_open_at?: string | null
          id?: string
          last_app_open_at?: string | null
          last_offer_popup_at?: string | null
          onboarding_completed_at?: string | null
          phone?: string | null
          referral_code?: string | null
          referred_by_code?: string | null
          referred_by_user_id?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          eligible_tags: string[]
          ends_at: string | null
          first_booking_only: boolean
          is_active: boolean
          max_discount: number | null
          metadata: Json
          min_subtotal: number
          per_user_limit: number
          route_from: string | null
          route_to: string | null
          starts_at: string | null
          usage_limit: number | null
        }
        Insert: {
          code: string
          created_at?: string
          discount_type: string
          discount_value: number
          eligible_tags?: string[]
          ends_at?: string | null
          first_booking_only?: boolean
          is_active?: boolean
          max_discount?: number | null
          metadata?: Json
          min_subtotal?: number
          per_user_limit?: number
          route_from?: string | null
          route_to?: string | null
          starts_at?: string | null
          usage_limit?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          eligible_tags?: string[]
          ends_at?: string | null
          first_booking_only?: boolean
          is_active?: boolean
          max_discount?: number | null
          metadata?: Json
          min_subtotal?: number
          per_user_limit?: number
          route_from?: string | null
          route_to?: string | null
          starts_at?: string | null
          usage_limit?: number | null
        }
        Relationships: []
      }
      public_trip_shares: {
        Row: {
          created_at: string
          expires_at: string | null
          public_trip_code: string | null
          share_payload: Json
          token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          public_trip_code?: string | null
          share_payload: Json
          token: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          public_trip_code?: string | null
          share_payload?: Json
          token?: string
        }
        Relationships: []
      }
      route_templates: {
        Row: {
          active: boolean
          company: string
          created_at: string
          departure_time: string
          driver_img: string | null
          driver_name: string | null
          driver_rating: number
          driver_trips: number
          id: string
          rating: number
          route_id: string
          service_class: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          company: string
          created_at?: string
          departure_time: string
          driver_img?: string | null
          driver_name?: string | null
          driver_rating?: number
          driver_trips?: number
          id?: string
          rating?: number
          route_id: string
          service_class: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          company?: string
          created_at?: string
          departure_time?: string
          driver_img?: string | null
          driver_name?: string | null
          driver_rating?: number
          driver_trips?: number
          id?: string
          rating?: number
          route_id?: string
          service_class?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_templates_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          active: boolean
          base_price: number
          created_at: string
          duration_minutes: number
          from_city_id: string
          from_station_id: string
          has_rest_stop: boolean
          id: string
          to_city_id: string
          to_station_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_price: number
          created_at?: string
          duration_minutes: number
          from_city_id: string
          from_station_id: string
          has_rest_stop?: boolean
          id?: string
          to_city_id: string
          to_station_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_price?: number
          created_at?: string
          duration_minutes?: number
          from_city_id?: string
          from_station_id?: string
          has_rest_stop?: boolean
          id?: string
          to_city_id?: string
          to_station_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routes_from_city_id_fkey"
            columns: ["from_city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_from_station_id_fkey"
            columns: ["from_station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_to_city_id_fkey"
            columns: ["to_city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_to_station_id_fkey"
            columns: ["to_station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      stations: {
        Row: {
          active: boolean
          address: string | null
          city_id: string
          created_at: string
          id: string
          is_primary: boolean
          lat: number | null
          lng: number | null
          name_ar: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          city_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          lat?: number | null
          lng?: number | null
          name_ar: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          city_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          lat?: number | null
          lng?: number | null
          name_ar?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stations_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_instances: {
        Row: {
          arrival_time: string
          available_seats_count: number
          badge: string | null
          capacity: number
          company: string
          created_at: string
          departure_date: string
          departure_time: string
          driver_img: string | null
          driver_name: string | null
          driver_rating: number | null
          driver_trips: number | null
          duration_hours: number
          from_city: string
          from_station_id: string | null
          from_station_name: string | null
          has_rest_stop: boolean
          id: string
          inventory_source: string
          price: number
          rating: number
          route_id: string
          route_template_id: string
          service_class: string
          status: string
          to_city: string
          to_station_id: string | null
          to_station_name: string | null
          trip_code: string
          updated_at: string
        }
        Insert: {
          arrival_time: string
          available_seats_count?: number
          badge?: string | null
          capacity?: number
          company: string
          created_at?: string
          departure_date: string
          departure_time: string
          driver_img?: string | null
          driver_name?: string | null
          driver_rating?: number | null
          driver_trips?: number | null
          duration_hours: number
          from_city: string
          from_station_id?: string | null
          from_station_name?: string | null
          has_rest_stop?: boolean
          id?: string
          inventory_source?: string
          price: number
          rating?: number
          route_id: string
          route_template_id: string
          service_class: string
          status?: string
          to_city: string
          to_station_id?: string | null
          to_station_name?: string | null
          trip_code: string
          updated_at?: string
        }
        Update: {
          arrival_time?: string
          available_seats_count?: number
          badge?: string | null
          capacity?: number
          company?: string
          created_at?: string
          departure_date?: string
          departure_time?: string
          driver_img?: string | null
          driver_name?: string | null
          driver_rating?: number | null
          driver_trips?: number | null
          duration_hours?: number
          from_city?: string
          from_station_id?: string | null
          from_station_name?: string | null
          has_rest_stop?: boolean
          id?: string
          inventory_source?: string
          price?: number
          rating?: number
          route_id?: string
          route_template_id?: string
          service_class?: string
          status?: string
          to_city?: string
          to_station_id?: string | null
          to_station_name?: string | null
          trip_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_instances_from_station_id_fkey"
            columns: ["from_station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_instances_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_instances_route_template_id_fkey"
            columns: ["route_template_id"]
            isOneToOne: false
            referencedRelation: "route_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_instances_to_station_id_fkey"
            columns: ["to_station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_seats: {
        Row: {
          booking_id: string | null
          created_at: string
          held_by_user_id: string | null
          hold_expires_at: string | null
          hold_token: string | null
          id: string
          seat_index: number
          seat_number: string
          status: string
          trip_instance_id: string
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          held_by_user_id?: string | null
          hold_expires_at?: string | null
          hold_token?: string | null
          id?: string
          seat_index: number
          seat_number: string
          status?: string
          trip_instance_id: string
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          held_by_user_id?: string | null
          hold_expires_at?: string | null
          hold_token?: string | null
          id?: string
          seat_index?: number
          seat_number?: string
          status?: string
          trip_instance_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_seats_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_seats_trip_instance_id_fkey"
            columns: ["trip_instance_id"]
            isOneToOne: false
            referencedRelation: "trip_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_topup_requests: {
        Row: {
          client_id: string | null
          completed_at: string | null
          created_at: string
          credited_at: string | null
          expired_at: string | null
          expires_at: string | null
          external_reference: string | null
          failed_at: string | null
          fee_amount: number | null
          gross_amount: number | null
          id: string
          last_error: string | null
          latest_amount: number | null
          metadata: Json | null
          net_amount: number | null
          paid_at: string | null
          payer_label: string | null
          payment_channel: string | null
          public_token: string
          request_id: string | null
          status: string
          updated_at: string | null
          user_id: string
          wallet_transaction_ref: string | null
        }
        Insert: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          credited_at?: string | null
          expired_at?: string | null
          expires_at?: string | null
          external_reference?: string | null
          failed_at?: string | null
          fee_amount?: number | null
          gross_amount?: number | null
          id?: string
          last_error?: string | null
          latest_amount?: number | null
          metadata?: Json | null
          net_amount?: number | null
          paid_at?: string | null
          payer_label?: string | null
          payment_channel?: string | null
          public_token: string
          request_id?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
          wallet_transaction_ref?: string | null
        }
        Update: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          credited_at?: string | null
          expired_at?: string | null
          expires_at?: string | null
          external_reference?: string | null
          failed_at?: string | null
          fee_amount?: number | null
          gross_amount?: number | null
          id?: string
          last_error?: string | null
          latest_amount?: number | null
          metadata?: Json | null
          net_amount?: number | null
          paid_at?: string | null
          payer_label?: string | null
          payment_channel?: string | null
          public_token?: string
          request_id?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
          wallet_transaction_ref?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_referral_code: {
        Args: { p_code: string; p_user_id: string }
        Returns: Json
      }
      campaign_matches_user: {
        Args: {
          p_campaign: Database["public"]["Tables"]["app_promo_campaigns"]["Row"]
          p_context?: Json
          p_user_id: string
        }
        Returns: boolean
      }
      cancel_booking_atomic:
        | {
            Args: { p_booking_id: string; p_client_action_id?: string }
            Returns: Json
          }
        | { Args: { p_booking_id: string }; Returns: Json }
      complete_wallet_topup_request: {
        Args: {
          p_amount: number
          p_payer_label?: string
          p_public_token: string
          p_request_id: string
        }
        Returns: Json
      }
      confirm_booking_authoritative: {
        Args: {
          p_has_luggage?: boolean
          p_hold_token?: string
          p_idempotency_key?: string
          p_needs_access?: boolean
          p_passengers: number
          p_promo_code?: string
          p_ride_to_station?: boolean
          p_seat_numbers: string[]
          p_trip_instance_id: string
        }
        Returns: Json
      }
      consume_app_promo_code: {
        Args: {
          p_booking_id: string
          p_code: string
          p_discount_amount?: number
          p_user_id: string
        }
        Returns: undefined
      }
      create_booking_atomic: {
        Args: {
          p_has_luggage?: boolean
          p_needs_access?: boolean
          p_passengers: number
          p_promo_code?: string
          p_ride_to_station?: boolean
          p_seat_numbers: string[]
          p_trip_instance_id: string
        }
        Returns: Json
      }
      create_public_trip_share: { Args: { p_payload: Json }; Returns: Json }
      create_wallet_topup_request: {
        Args: never
        Returns: {
          public_token: string
          request_id: string
        }[]
      }
      deliver_user_notification: {
        Args: { p_payload?: Json; p_user_id: string }
        Returns: {
          body: string
          campaign_id: string | null
          category: string
          created_at: string
          cta_action: string | null
          cta_label: string | null
          dedupe_key: string | null
          delivered_at: string
          dismissed_at: string | null
          expires_at: string | null
          id: string
          payload: Json
          priority: number
          read_at: string | null
          source: string
          title: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "app_user_notifications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      deliver_user_notification_internal: {
        Args: { p_payload?: Json; p_user_id: string }
        Returns: {
          body: string
          campaign_id: string | null
          category: string
          created_at: string
          cta_action: string | null
          cta_label: string | null
          dedupe_key: string | null
          delivered_at: string
          dismissed_at: string | null
          expires_at: string | null
          id: string
          payload: Json
          priority: number
          read_at: string | null
          source: string
          title: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "app_user_notifications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      dismiss_user_notifications: {
        Args: { p_ids?: string[]; p_user_id: string }
        Returns: number
      }
      ensure_app_wallet: { Args: { p_user_id: string }; Returns: undefined }
      ensure_referral_code: { Args: { p_user_id: string }; Returns: string }
      generate_seat_label: { Args: { p_index: number }; Returns: string }
      get_promo_popup_offer: { Args: { p_user_id?: string }; Returns: Json }
      get_public_trip_share: { Args: { p_token: string }; Returns: Json }
      get_referral_summary: { Args: { p_user_id: string }; Returns: Json }
      get_targeted_promo_offer: {
        Args: { p_context?: Json; p_user_id: string }
        Returns: Json
      }
      get_trip_seats: {
        Args: { p_trip_instance_id: string }
        Returns: {
          held_by_user_id: string
          hold_expires_at: string
          id: string
          seat_index: number
          seat_number: string
          status: string
        }[]
      }
      get_wallet_topup_request_public: {
        Args: { p_public_token: string; p_request_id: string }
        Returns: {
          created_at: string
          request_id: string
          status: string
        }[]
      }
      hold_trip_seats: {
        Args: {
          p_hold_minutes?: number
          p_seat_numbers: string[]
          p_trip_instance_id: string
        }
        Returns: Json
      }
      hours_until_trip_departure: {
        Args: { p_departure_date: string; p_departure_time: string }
        Returns: number
      }
      list_user_notifications: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          body: string
          campaign_id: string | null
          category: string
          created_at: string
          cta_action: string | null
          cta_label: string | null
          dedupe_key: string | null
          delivered_at: string
          dismissed_at: string | null
          expires_at: string | null
          id: string
          payload: Json
          priority: number
          read_at: string | null
          source: string
          title: string
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "app_user_notifications"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      mark_user_notifications_read: {
        Args: { p_ids?: string[]; p_user_id: string }
        Returns: number
      }
      preview_app_promo: {
        Args: {
          p_booking_amount: number
          p_code: string
          p_trip_meta?: Json
          p_user_id: string
        }
        Returns: Json
      }
      preview_booking_cancellation: {
        Args: { p_booking_id: string }
        Returns: Json
      }
      preview_booking_cancellation_atomic: {
        Args: { p_booking_id: string }
        Returns: Json
      }
      public_topup_wallet:
        | {
            Args: { p_amount: number; p_request_id?: string; p_user_id: string }
            Returns: Json
          }
        | {
            Args: {
              p_amount: number
              p_payment_channel?: string
              p_request_id?: string
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_amount: number
              p_client_id?: string
              p_payment_channel?: string
              p_request_id: string
              p_user_id: string
            }
            Returns: Json
          }
      recalculate_trip_available_seats: {
        Args: { p_trip_instance_id: string }
        Returns: number
      }
      record_campaign_event: {
        Args: {
          p_campaign_id?: string
          p_event_name?: string
          p_event_source?: string
          p_metadata?: Json
          p_user_id: string
        }
        Returns: string
      }
      release_expired_seat_holds: {
        Args: { p_trip_instance_id?: string }
        Returns: number
      }
      release_my_seat_hold: {
        Args: { p_trip_instance_id: string }
        Returns: Json
      }
      request_key_to_uuid: { Args: { p_value: string }; Returns: string }
      request_self_account_deletion: { Args: never; Returns: Json }
      require_same_user: { Args: { p_user_id: string }; Returns: undefined }
      seed_reference_travel_data: { Args: never; Returns: undefined }
      seed_trip_inventory_for_search: {
        Args: {
          p_departure_date: string
          p_from_city: string
          p_to_city: string
        }
        Returns: Json
      }
      sync_referral_rewards: { Args: { p_user_id: string }; Returns: number }
      sync_user_engagement: {
        Args: { p_context?: Json; p_user_id: string }
        Returns: Json
      }
      user_booking_snapshot: {
        Args: { p_user_id: string }
        Returns: {
          active_bookings: number
          last_booking_at: string
          qualifying_bookings: number
          total_bookings: number
        }[]
      }
      user_wallet_balance: { Args: { p_user_id: string }; Returns: number }
      validate_app_promo_code: {
        Args: {
          p_booking_amount: number
          p_code: string
          p_trip_meta?: Json
          p_user_id: string
        }
        Returns: Json
      }
      wallet_topup_request_confirm: {
        Args: {
          p_client_id?: string
          p_payment_channel?: string
          p_request_id: string
        }
        Returns: Json
      }
      wallet_topup_request_confirm_public: {
        Args: {
          p_client_id?: string
          p_payment_channel?: string
          p_request_id: string
        }
        Returns: Json
      }
      wallet_topup_request_create_or_get: {
        Args: {
          p_client_id?: string
          p_fee_amount: number
          p_gross_amount: number
          p_metadata?: Json
          p_net_amount: number
          p_payment_channel?: string
          p_request_id: string
          p_user_id: string
        }
        Returns: Json
      }
      wallet_topup_request_create_or_get_public: {
        Args: {
          p_client_id?: string
          p_fee_amount: number
          p_gross_amount: number
          p_metadata?: Json
          p_net_amount: number
          p_payment_channel?: string
          p_request_id: string
          p_user_id: string
        }
        Returns: Json
      }
      wallet_topup_request_payload: {
        Args: {
          p_req: Database["public"]["Tables"]["wallet_topup_requests"]["Row"]
        }
        Returns: Json
      }
      wallet_topup_request_status: {
        Args: { p_request_id: string; p_user_id?: string }
        Returns: Json
      }
      wallet_topup_request_status_public: {
        Args: { p_request_id: string; p_user_id?: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
