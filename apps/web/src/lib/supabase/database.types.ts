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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      allocation_configs: {
        Row: {
          created_at: string
          id: string
          pct_disponivel: number
          pct_emergencia: number
          pct_veiculo: number
          user_id: string
          valid_from: string
        }
        Insert: {
          created_at?: string
          id?: string
          pct_disponivel: number
          pct_emergencia: number
          pct_veiculo: number
          user_id: string
          valid_from?: string
        }
        Update: {
          created_at?: string
          id?: string
          pct_disponivel?: number
          pct_emergencia?: number
          pct_veiculo?: number
          user_id?: string
          valid_from?: string
        }
        Relationships: []
      }
      app_events: {
        Row: {
          event_key: string
          id: number
          metadata: Json
          occurred_at: string
          user_id: string | null
        }
        Insert: {
          event_key: string
          id?: never
          metadata?: Json
          occurred_at?: string
          user_id?: string | null
        }
        Update: {
          event_key?: string
          id?: never
          metadata?: Json
          occurred_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          archived_at: string | null
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_favorite: boolean
          is_system: boolean
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_favorite?: boolean
          is_system?: boolean
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_favorite?: boolean
          is_system?: boolean
          kind?: Database["public"]["Enums"]["category_kind"]
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      consents: {
        Row: {
          accepted_at: string
          document_id: string
          id: string
          ip_hash: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          document_id: string
          id?: string
          ip_hash?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          document_id?: string
          id?: string
          ip_hash?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "legal_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          id?: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          amount_off: number | null
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_redemptions: number | null
          percent_off: number | null
          redeemed_count: number
          trial_days: number | null
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          amount_off?: number | null
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          percent_off?: number | null
          redeemed_count?: number
          trial_days?: number | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          amount_off?: number | null
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          percent_off?: number | null
          redeemed_count?: number
          trial_days?: number | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      custom_field_defs: {
        Row: {
          archived_at: string | null
          created_at: string
          field_type: Database["public"]["Enums"]["field_kind"]
          id: string
          key: string
          label: string
          options: Json | null
          required: boolean
          sort_order: number
          target: Database["public"]["Enums"]["entity_target"]
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          field_type: Database["public"]["Enums"]["field_kind"]
          id?: string
          key: string
          label: string
          options?: Json | null
          required?: boolean
          sort_order?: number
          target: Database["public"]["Enums"]["entity_target"]
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          field_type?: Database["public"]["Enums"]["field_kind"]
          id?: string
          key?: string
          label?: string
          options?: Json | null
          required?: boolean
          sort_order?: number
          target?: Database["public"]["Enums"]["entity_target"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      day_targets: {
        Row: {
          created_at: string
          target_value: number
          updated_at: string
          user_id: string
          work_date: string
        }
        Insert: {
          created_at?: string
          target_value: number
          updated_at?: string
          user_id?: string
          work_date: string
        }
        Update: {
          created_at?: string
          target_value?: number
          updated_at?: string
          user_id?: string
          work_date?: string
        }
        Relationships: []
      }
      device_tokens: {
        Row: {
          created_at: string
          id: string
          last_used_at: string | null
          nome: string
          prefixo: string
          revoked_at: string | null
          token_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          nome: string
          prefixo: string
          revoked_at?: string | null
          token_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          nome?: string
          prefixo?: string
          revoked_at?: string | null
          token_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          context: Json
          id: number
          level: string
          message: string
          occurred_at: string
          user_id: string | null
        }
        Insert: {
          context?: Json
          id?: never
          level?: string
          message: string
          occurred_at?: string
          user_id?: string | null
        }
        Update: {
          context?: Json
          id?: never
          level?: string
          message?: string
          occurred_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      fuel_entries: {
        Row: {
          cashback: number
          created_at: string
          custom_values: Json
          desconto: number
          filled_at: string
          fuel_kind: Database["public"]["Enums"]["fuel_kind"]
          id: string
          litros: number
          notes: string | null
          odometro: number | null
          preco_anunciado: number | null
          preco_real_litro: number | null
          station: string | null
          tanque_cheio: boolean
          updated_at: string
          user_id: string
          valor_bruto: number
          valor_pago: number
          vehicle_id: string
        }
        Insert: {
          cashback?: number
          created_at?: string
          custom_values?: Json
          desconto?: number
          filled_at?: string
          fuel_kind: Database["public"]["Enums"]["fuel_kind"]
          id?: string
          litros: number
          notes?: string | null
          odometro?: number | null
          preco_anunciado?: number | null
          preco_real_litro?: number | null
          station?: string | null
          tanque_cheio?: boolean
          updated_at?: string
          user_id: string
          valor_bruto: number
          valor_pago: number
          vehicle_id: string
        }
        Update: {
          cashback?: number
          created_at?: string
          custom_values?: Json
          desconto?: number
          filled_at?: string
          fuel_kind?: Database["public"]["Enums"]["fuel_kind"]
          id?: string
          litros?: number
          notes?: string | null
          odometro?: number | null
          preco_anunciado?: number | null
          preco_real_litro?: number | null
          station?: string | null
          tanque_cheio?: boolean
          updated_at?: string
          user_id?: string
          valor_bruto?: number
          valor_pago?: number
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fuel_entries_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["goal_kind"]
          period_end: string | null
          period_start: string | null
          target_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          kind: Database["public"]["Enums"]["goal_kind"]
          period_end?: string | null
          period_start?: string | null
          target_value: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["goal_kind"]
          period_end?: string | null
          period_start?: string | null
          target_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          content_md: string
          created_at: string
          effective_at: string
          id: string
          is_current: boolean
          kind: Database["public"]["Enums"]["legal_doc_kind"]
          title: string
          version: string
        }
        Insert: {
          content_md: string
          created_at?: string
          effective_at?: string
          id?: string
          is_current?: boolean
          kind: Database["public"]["Enums"]["legal_doc_kind"]
          title: string
          version: string
        }
        Update: {
          content_md?: string
          created_at?: string
          effective_at?: string
          id?: string
          is_current?: boolean
          kind?: Database["public"]["Enums"]["legal_doc_kind"]
          title?: string
          version?: string
        }
        Relationships: []
      }
      maintenances: {
        Row: {
          category_id: string | null
          created_at: string
          custom_values: Json
          description: string | null
          id: string
          next_date: string | null
          next_km: number | null
          odometro: number | null
          pago_com_reserva: boolean
          performed_at: string
          updated_at: string
          user_id: string
          valor: number
          vehicle_id: string
          workshop: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          custom_values?: Json
          description?: string | null
          id?: string
          next_date?: string | null
          next_km?: number | null
          odometro?: number | null
          pago_com_reserva?: boolean
          performed_at?: string
          updated_at?: string
          user_id: string
          valor: number
          vehicle_id: string
          workshop?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          custom_values?: Json
          description?: string | null
          id?: string
          next_date?: string | null
          next_km?: number | null
          odometro?: number | null
          pago_com_reserva?: boolean
          performed_at?: string
          updated_at?: string
          user_id?: string
          valor?: number
          vehicle_id?: string
          workshop?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenances_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenances_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_settings: {
        Row: {
          created_at: string
          custo_manutencao_km: number | null
          custo_outros_km: number
          custo_pneus_km: number
          custo_revisao_km: number
          liq_h_verde: number
          liq_h_vermelho: number
          rs_h_verde: number
          rs_h_vermelho: number
          rs_km_verde: number
          rs_km_vermelho: number
          updated_at: string
          user_id: string
          work_weekdays: number[]
        }
        Insert: {
          created_at?: string
          custo_manutencao_km?: number | null
          custo_outros_km?: number
          custo_pneus_km?: number
          custo_revisao_km?: number
          liq_h_verde?: number
          liq_h_vermelho?: number
          rs_h_verde?: number
          rs_h_vermelho?: number
          rs_km_verde?: number
          rs_km_vermelho?: number
          updated_at?: string
          user_id?: string
          work_weekdays?: number[]
        }
        Update: {
          created_at?: string
          custo_manutencao_km?: number | null
          custo_outros_km?: number
          custo_pneus_km?: number
          custo_revisao_km?: number
          liq_h_verde?: number
          liq_h_vermelho?: number
          rs_h_verde?: number
          rs_h_vermelho?: number
          rs_km_verde?: number
          rs_km_vermelho?: number
          updated_at?: string
          user_id?: string
          work_weekdays?: number[]
        }
        Relationships: []
      }
      month_targets: {
        Row: {
          created_at: string
          id: string
          month: string
          target_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          month: string
          target_value: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          month?: string
          target_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_entitlements: {
        Row: {
          created_at: string
          enabled: boolean
          feature_key: string
          id: string
          limit_value: number | null
          plan_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature_key: string
          id?: string
          limit_value?: number | null
          plan_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature_key?: string
          id?: string
          limit_value?: number | null
          plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_entitlements_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price_monthly: number
          price_yearly: number
          sort_order: number
          trial_days: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price_monthly?: number
          price_yearly?: number
          sort_order?: number
          trial_days?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price_monthly?: number
          price_yearly?: number
          sort_order?: number
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          onboarding_done: boolean
          template_id: string | null
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          onboarding_done?: boolean
          template_id?: string | null
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          onboarding_done?: boolean
          template_id?: string | null
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_seen_at: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_seen_at?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_seen_at?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          bucket: string
          count: number
          user_id: string
          window_start: string
        }
        Insert: {
          bucket: string
          count?: number
          user_id: string
          window_start: string
        }
        Update: {
          bucket?: string
          count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      reserve_movements: {
        Row: {
          created_at: string
          description: string | null
          direction: Database["public"]["Enums"]["movement_dir"]
          id: string
          maintenance_id: string | null
          occurred_on: string
          reserve_kind: Database["public"]["Enums"]["reserve_kind"]
          shift_id: string | null
          source: Database["public"]["Enums"]["movement_src"]
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          direction: Database["public"]["Enums"]["movement_dir"]
          id?: string
          maintenance_id?: string | null
          occurred_on?: string
          reserve_kind: Database["public"]["Enums"]["reserve_kind"]
          shift_id?: string | null
          source: Database["public"]["Enums"]["movement_src"]
          updated_at?: string
          user_id: string
          valor: number
        }
        Update: {
          created_at?: string
          description?: string | null
          direction?: Database["public"]["Enums"]["movement_dir"]
          id?: string
          maintenance_id?: string | null
          occurred_on?: string
          reserve_kind?: Database["public"]["Enums"]["reserve_kind"]
          shift_id?: string | null
          source?: Database["public"]["Enums"]["movement_src"]
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "reserve_movements_maintenance_id_fkey"
            columns: ["maintenance_id"]
            isOneToOne: false
            referencedRelation: "maintenances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reserve_movements_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_evaluations: {
        Row: {
          aceita: boolean | null
          categoria: string | null
          created_at: string
          custo_estimado: number | null
          evaluated_at: string
          id: string
          km_busca: number
          km_viagem: number
          margem_estimada: number | null
          min_busca: number
          min_viagem: number
          motivos: Json
          nota_passageiro: number | null
          regiao_destino: string | null
          rs_hora: number | null
          rs_km: number | null
          shift_id: string | null
          user_id: string
          valor: number
          veredito: string | null
        }
        Insert: {
          aceita?: boolean | null
          categoria?: string | null
          created_at?: string
          custo_estimado?: number | null
          evaluated_at?: string
          id?: string
          km_busca?: number
          km_viagem?: number
          margem_estimada?: number | null
          min_busca?: number
          min_viagem?: number
          motivos?: Json
          nota_passageiro?: number | null
          regiao_destino?: string | null
          rs_hora?: number | null
          rs_km?: number | null
          shift_id?: string | null
          user_id: string
          valor: number
          veredito?: string | null
        }
        Update: {
          aceita?: boolean | null
          categoria?: string | null
          created_at?: string
          custo_estimado?: number | null
          evaluated_at?: string
          id?: string
          km_busca?: number
          km_viagem?: number
          margem_estimada?: number | null
          min_busca?: number
          min_viagem?: number
          motivos?: Json
          nota_passageiro?: number | null
          regiao_destino?: string | null
          rs_hora?: number | null
          rs_km?: number | null
          shift_id?: string | null
          user_id?: string
          valor?: number
          veredito?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ride_evaluations_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_rules: {
        Row: {
          created_at: string
          dist_max_busca: number | null
          id: string
          is_active: boolean
          margem_min: number | null
          name: string
          nota_min: number | null
          rs_hora_min: number | null
          rs_km_min: number | null
          updated_at: string
          user_id: string
          valor_min: number | null
        }
        Insert: {
          created_at?: string
          dist_max_busca?: number | null
          id?: string
          is_active?: boolean
          margem_min?: number | null
          name?: string
          nota_min?: number | null
          rs_hora_min?: number | null
          rs_km_min?: number | null
          updated_at?: string
          user_id: string
          valor_min?: number | null
        }
        Update: {
          created_at?: string
          dist_max_busca?: number | null
          id?: string
          is_active?: boolean
          margem_min?: number | null
          name?: string
          nota_min?: number | null
          rs_hora_min?: number | null
          rs_km_min?: number | null
          updated_at?: string
          user_id?: string
          valor_min?: number | null
        }
        Relationships: []
      }
      shift_revenues: {
        Row: {
          category_id: string
          created_at: string
          duracao_min: number | null
          id: string
          km: number | null
          nota_passageiro: number | null
          notes: string | null
          occurred_at: string
          qtd_corridas: number | null
          shift_id: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          category_id: string
          created_at?: string
          duracao_min?: number | null
          id?: string
          km?: number | null
          nota_passageiro?: number | null
          notes?: string | null
          occurred_at?: string
          qtd_corridas?: number | null
          shift_id: string
          updated_at?: string
          user_id: string
          valor: number
        }
        Update: {
          category_id?: string
          created_at?: string
          duracao_min?: number | null
          id?: string
          km?: number | null
          nota_passageiro?: number | null
          notes?: string | null
          occurred_at?: string
          qtd_corridas?: number | null
          shift_id?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "shift_revenues_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_revenues_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          allocation_config_id: string | null
          closed_at: string | null
          consumo_usado: number | null
          created_at: string
          custom_values: Json
          ended_at: string | null
          fuel_kind_usado: Database["public"]["Enums"]["fuel_kind"] | null
          id: string
          notes: string | null
          odo_final: number | null
          odo_inicial: number
          paused_at: string | null
          paused_seconds: number
          preco_combustivel_usado: number | null
          snap_corridas: number | null
          snap_custo_combustivel: number | null
          snap_disponivel: number | null
          snap_faturamento: number | null
          snap_horas: number | null
          snap_km: number | null
          snap_litros: number | null
          snap_outras_despesas: number | null
          snap_reserva_emerg: number | null
          snap_reserva_veiculo: number | null
          snap_resultado_op: number | null
          started_at: string
          status: Database["public"]["Enums"]["shift_status"]
          updated_at: string
          user_id: string
          vehicle_id: string
          work_date: string
        }
        Insert: {
          allocation_config_id?: string | null
          closed_at?: string | null
          consumo_usado?: number | null
          created_at?: string
          custom_values?: Json
          ended_at?: string | null
          fuel_kind_usado?: Database["public"]["Enums"]["fuel_kind"] | null
          id?: string
          notes?: string | null
          odo_final?: number | null
          odo_inicial: number
          paused_at?: string | null
          paused_seconds?: number
          preco_combustivel_usado?: number | null
          snap_corridas?: number | null
          snap_custo_combustivel?: number | null
          snap_disponivel?: number | null
          snap_faturamento?: number | null
          snap_horas?: number | null
          snap_km?: number | null
          snap_litros?: number | null
          snap_outras_despesas?: number | null
          snap_reserva_emerg?: number | null
          snap_reserva_veiculo?: number | null
          snap_resultado_op?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["shift_status"]
          updated_at?: string
          user_id: string
          vehicle_id: string
          work_date: string
        }
        Update: {
          allocation_config_id?: string | null
          closed_at?: string | null
          consumo_usado?: number | null
          created_at?: string
          custom_values?: Json
          ended_at?: string | null
          fuel_kind_usado?: Database["public"]["Enums"]["fuel_kind"] | null
          id?: string
          notes?: string | null
          odo_final?: number | null
          odo_inicial?: number
          paused_at?: string | null
          paused_seconds?: number
          preco_combustivel_usado?: number | null
          snap_corridas?: number | null
          snap_custo_combustivel?: number | null
          snap_disponivel?: number | null
          snap_faturamento?: number | null
          snap_horas?: number | null
          snap_km?: number | null
          snap_litros?: number | null
          snap_outras_despesas?: number | null
          snap_reserva_emerg?: number | null
          snap_reserva_veiculo?: number | null
          snap_resultado_op?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["shift_status"]
          updated_at?: string
          user_id?: string
          vehicle_id?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_allocation_config_id_fkey"
            columns: ["allocation_config_id"]
            isOneToOne: false
            referencedRelation: "allocation_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string
          gateway: string | null
          gateway_ref: string | null
          id: string
          plan_id: string
          status: Database["public"]["Enums"]["sub_status"]
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          gateway?: string | null
          gateway_ref?: string | null
          id?: string
          plan_id: string
          status?: Database["public"]["Enums"]["sub_status"]
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          gateway?: string | null
          gateway_ref?: string | null
          id?: string
          plan_id?: string
          status?: Database["public"]["Enums"]["sub_status"]
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      template_categories: {
        Row: {
          color: string | null
          icon: string | null
          id: string
          is_favorite: boolean
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          sort_order: number
          template_id: string
        }
        Insert: {
          color?: string | null
          icon?: string | null
          id?: string
          is_favorite?: boolean
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          sort_order?: number
          template_id: string
        }
        Update: {
          color?: string | null
          icon?: string | null
          id?: string
          is_favorite?: boolean
          kind?: Database["public"]["Enums"]["category_kind"]
          name?: string
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_categories_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_dashboard: {
        Row: {
          card_key: string
          id: string
          sort_order: number
          template_id: string
        }
        Insert: {
          card_key: string
          id?: string
          sort_order?: number
          template_id: string
        }
        Update: {
          card_key?: string
          id?: string
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_dashboard_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_fields: {
        Row: {
          field_type: Database["public"]["Enums"]["field_kind"]
          id: string
          key: string
          label: string
          sort_order: number
          target: Database["public"]["Enums"]["entity_target"]
          template_id: string
        }
        Insert: {
          field_type: Database["public"]["Enums"]["field_kind"]
          id?: string
          key: string
          label: string
          sort_order?: number
          target: Database["public"]["Enums"]["entity_target"]
          template_id: string
        }
        Update: {
          field_type?: Database["public"]["Enums"]["field_kind"]
          id?: string
          key?: string
          label?: string
          sort_order?: number
          target?: Database["public"]["Enums"]["entity_target"]
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_fields_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          code: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      transactions: {
        Row: {
          category_id: string
          created_at: string
          custom_values: Json
          description: string | null
          id: string
          kind: Database["public"]["Enums"]["category_kind"]
          occurred_at: string
          shift_id: string | null
          updated_at: string
          user_id: string
          valor: number
          vehicle_id: string | null
          work_date: string
        }
        Insert: {
          category_id: string
          created_at?: string
          custom_values?: Json
          description?: string | null
          id?: string
          kind: Database["public"]["Enums"]["category_kind"]
          occurred_at?: string
          shift_id?: string | null
          updated_at?: string
          user_id: string
          valor: number
          vehicle_id?: string | null
          work_date: string
        }
        Update: {
          category_id?: string
          created_at?: string
          custom_values?: Json
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["category_kind"]
          occurred_at?: string
          shift_id?: string | null
          updated_at?: string
          user_id?: string
          valor?: number
          vehicle_id?: string | null
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          cashback_reduces_cost: boolean
          created_at: string
          dashboard_cards: Json
          default_vehicle_id: string | null
          fuel_price_mode: Database["public"]["Enums"]["fuel_price_mode"]
          ride_cost_basis: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cashback_reduces_cost?: boolean
          created_at?: string
          dashboard_cards?: Json
          default_vehicle_id?: string | null
          fuel_price_mode?: Database["public"]["Enums"]["fuel_price_mode"]
          ride_cost_basis?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cashback_reduces_cost?: boolean
          created_at?: string
          dashboard_cards?: Json
          default_vehicle_id?: string | null
          fuel_price_mode?: Database["public"]["Enums"]["fuel_price_mode"]
          ride_cost_basis?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_default_vehicle_fkey"
            columns: ["default_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          archived_at: string | null
          consumo_ref_etanol: number | null
          consumo_ref_gasolina: number | null
          consumo_ref_gnv: number | null
          created_at: string
          custos_fixos_mensais: number
          fuels: Database["public"]["Enums"]["fuel_kind"][]
          id: string
          km_medio_mensal: number | null
          make_model: string | null
          manutencao_km_estimada: number | null
          model_year: number | null
          nickname: string
          odometro_atual: number | null
          plate: string | null
          seguro_mensal: number
          updated_at: string
          user_id: string
          valor_compra: number | null
          valor_residual_est: number | null
          vida_util_km: number | null
        }
        Insert: {
          archived_at?: string | null
          consumo_ref_etanol?: number | null
          consumo_ref_gasolina?: number | null
          consumo_ref_gnv?: number | null
          created_at?: string
          custos_fixos_mensais?: number
          fuels?: Database["public"]["Enums"]["fuel_kind"][]
          id?: string
          km_medio_mensal?: number | null
          make_model?: string | null
          manutencao_km_estimada?: number | null
          model_year?: number | null
          nickname: string
          odometro_atual?: number | null
          plate?: string | null
          seguro_mensal?: number
          updated_at?: string
          user_id: string
          valor_compra?: number | null
          valor_residual_est?: number | null
          vida_util_km?: number | null
        }
        Update: {
          archived_at?: string | null
          consumo_ref_etanol?: number | null
          consumo_ref_gasolina?: number | null
          consumo_ref_gnv?: number | null
          created_at?: string
          custos_fixos_mensais?: number
          fuels?: Database["public"]["Enums"]["fuel_kind"][]
          id?: string
          km_medio_mensal?: number | null
          make_model?: string | null
          manutencao_km_estimada?: number | null
          model_year?: number | null
          nickname?: string
          odometro_atual?: number | null
          plate?: string | null
          seguro_mensal?: number
          updated_at?: string
          user_id?: string
          valor_compra?: number | null
          valor_residual_est?: number | null
          vida_util_km?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      v_reserve_balances: {
        Row: {
          reserve_kind: Database["public"]["Enums"]["reserve_kind"] | null
          saldo: number | null
          total_creditado: number | null
          total_gasto: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_metrics: { Args: never; Returns: Json }
      admin_users: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          created_at: string
          email: string
          last_sign_in_at: string
          onboarding_done: boolean
          plan_code: string
          sub_status: string
          ultimo_evento: string
          user_id: string
        }[]
      }
      apply_template: { Args: { p_template_id: string }; Returns: undefined }
      can: { Args: { p_feature: string }; Returns: boolean }
      consumir_cota: {
        Args: { p_bucket: string; p_janela_segundos?: number; p_max: number }
        Returns: {
          libera_em: string
          permitido: boolean
          restante: number
        }[]
      }
      current_plan_id: { Args: never; Returns: string }
      delete_my_account: { Args: never; Returns: undefined }
      dispositivo_contexto: { Args: { p_hash: string }; Returns: Json }
      dispositivo_dono: { Args: { p_hash: string }; Returns: string }
      dispositivo_registrar_corrida: {
        Args: { p_dados: Json; p_hash: string }
        Returns: string
      }
      export_my_data: { Args: never; Returns: Json }
      fechar_turno: {
        Args: {
          p_allocation_config_id: string
          p_consumo: number
          p_creditos?: Json
          p_ended_at: string
          p_fuel_kind: Database["public"]["Enums"]["fuel_kind"]
          p_odo_final: number
          p_preco_combustivel: number
          p_receitas?: Json
          p_shift_id: string
          p_snapshot: Json
        }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      limpar_rate_limits: { Args: never; Returns: number }
      money_round: { Args: { v: number }; Returns: number }
      plan_limit: { Args: { p_feature: string }; Returns: number }
      registrar_sessao: {
        Args: {
          p_allocation_config_id: string
          p_consumo: number
          p_creditos?: Json
          p_ended_at: string
          p_fuel_kind: Database["public"]["Enums"]["fuel_kind"]
          p_notes?: string
          p_odo_final: number
          p_odo_inicial: number
          p_preco_combustivel: number
          p_receita: Json
          p_snapshot: Json
          p_started_at: string
          p_vehicle_id: string
          p_work_date: string
        }
        Returns: string
      }
      reserve_balance: {
        Args: { p_kind: Database["public"]["Enums"]["reserve_kind"] }
        Returns: number
      }
    }
    Enums: {
      category_kind: "receita" | "despesa" | "reserva"
      entity_target: "shift" | "fuel" | "transaction" | "maintenance"
      field_kind:
        | "texto"
        | "numero"
        | "moeda"
        | "percentual"
        | "km"
        | "litros"
        | "data"
        | "hora"
        | "booleano"
      fuel_kind: "gasolina" | "etanol" | "gnv" | "diesel" | "outro"
      fuel_price_mode: "ultimo" | "media_ponderada_30d"
      goal_kind:
        | "fat_diaria"
        | "fat_semanal"
        | "fat_mensal"
        | "liquido_mensal"
        | "rs_km_min"
        | "rs_h_min"
        | "reserva_emerg"
        | "reserva_veic"
      legal_doc_kind: "termos" | "privacidade"
      movement_dir: "credito" | "debito"
      movement_src: "shift" | "maintenance" | "manual" | "ajuste"
      reserve_kind: "veiculo" | "emergencia"
      shift_status: "aberto" | "fechado"
      sub_status: "trialing" | "active" | "past_due" | "canceled"
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
      category_kind: ["receita", "despesa", "reserva"],
      entity_target: ["shift", "fuel", "transaction", "maintenance"],
      field_kind: [
        "texto",
        "numero",
        "moeda",
        "percentual",
        "km",
        "litros",
        "data",
        "hora",
        "booleano",
      ],
      fuel_kind: ["gasolina", "etanol", "gnv", "diesel", "outro"],
      fuel_price_mode: ["ultimo", "media_ponderada_30d"],
      goal_kind: [
        "fat_diaria",
        "fat_semanal",
        "fat_mensal",
        "liquido_mensal",
        "rs_km_min",
        "rs_h_min",
        "reserva_emerg",
        "reserva_veic",
      ],
      legal_doc_kind: ["termos", "privacidade"],
      movement_dir: ["credito", "debito"],
      movement_src: ["shift", "maintenance", "manual", "ajuste"],
      reserve_kind: ["veiculo", "emergencia"],
      shift_status: ["aberto", "fechado"],
      sub_status: ["trialing", "active", "past_due", "canceled"],
    },
  },
} as const
