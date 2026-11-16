export type UserRole = "admin" | "supplier" | "customer";

export type Profile = {
  id: string;
  role: UserRole;
  full_name: string | null;
  email: string | null;
  created_at: string;
}

export type Supplier = {
  id: string;
  profile_id: string;
  name: string;
  supplier_type: string | null;
  min_order_kg: number | null;
  min_order_brl: number | null;
  payment_terms: string | null;
  seller_name: string | null;
  seller_whatsapp: string | null;
  delivery_info: string | null;
  notes: string | null;
  city: string | null;
  is_active: boolean;
  created_at: string;
}

export type Customer = {
  id: string;
  profile_id: string;
  name: string;
  business_type: string | null;
  cnpj: string | null;
  phone: string | null;
  city: string | null;
  is_active: boolean;
  created_at: string;
}

export type ProductCategory = {
  id: string;
  name: string;
  normalized_name: string;
  sort_order: number;
  created_at: string;
}

export type CanonicalProduct = {
  id: string;
  name: string;
  unit: string;
  category_id: string | null;
  created_at: string;
}

export type Product = {
  id: string;
  supplier_id: string;
  name: string;
  unit: string;
  category_id: string | null;
  normalized_name: string;
  canonical_id: string | null;
  is_active: boolean;
  created_at: string;
}

export type PriceQuote = {
  id: string;
  product_id: string;
  supplier_id: string;
  price: number;
  quote_date: string;
  created_at: string;
}

export type ProductRankingRow = {
  product_id: string;
  group_key: string;
  product_name: string;
  unit: string;
  category: string | null;
  category_id: string | null;
  supplier_id: string;
  supplier_name: string;
  supplier_city: string | null;
  price: number;
  quote_date: string;
  position: number;
}

type Rel = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type Table<T, R extends Rel[] = []> = { Row: T; Insert: Partial<T>; Update: Partial<T>; Relationships: R };

/**
 * Tipos escritos à mão a partir de supabase/migrations/0001_init.sql.
 * Quando o projeto Supabase existir, substitua por:
 *   npx supabase gen types typescript --project-id <id> > types/database.ts
 */
export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>;
      suppliers: Table<
        Supplier,
        [
          {
            foreignKeyName: "suppliers_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ]
      >;
      customers: Table<
        Customer,
        [
          {
            foreignKeyName: "customers_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ]
      >;
      product_categories: Table<ProductCategory>;
      canonical_products: Table<
        CanonicalProduct,
        [
          {
            foreignKeyName: "canonical_products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "product_categories";
            referencedColumns: ["id"];
          },
        ]
      >;
      products: Table<
        Product,
        [
          {
            foreignKeyName: "products_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_canonical_id_fkey";
            columns: ["canonical_id"];
            isOneToOne: false;
            referencedRelation: "canonical_products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "product_categories";
            referencedColumns: ["id"];
          },
        ]
      >;
      price_quotes: Table<
        PriceQuote,
        [
          {
            foreignKeyName: "price_quotes_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "price_quotes_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ]
      >;
    };
    Views: {
      latest_prices: {
        Row: Pick<PriceQuote, "product_id" | "supplier_id" | "price" | "quote_date">;
        Relationships: [];
      };
      product_ranking: { Row: ProductRankingRow; Relationships: [] };
    };
    Functions: {
      current_user_role: { Args: Record<string, never>; Returns: UserRole };
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: { user_role: UserRole };
    CompositeTypes: Record<string, never>;
  };
}
