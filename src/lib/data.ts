
import { supabase } from "@/lib/supabaseClient";

// --- Types ---
export interface Category {
  id: string;
  slug: string;
  title: string;
  description: string;
}

export interface Role {
  id: string;
  slug: string;
  title: string;
  categorySlug: string;
}

export interface Contest {
  id: string;
  slug: string;
  title: string;
  year: string | number;
  roleSlug: string;
  categorySlug: string;
  description: string;
}

// --- Fetchers ---

export const getCategories = async (): Promise<Category[]> => {
  const { data } = await supabase.from("categories").select("*").order("title");
  return (data || []).map((c: any) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    description: c.description || ""
  }));
};

export const getCategoryBySlug = async (slug: string): Promise<Category | null> => {
  const { data } = await supabase.from("categories").select("*").eq("slug", slug).single();
  if (!data) return null;
  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    description: data.description || ""
  };
};

export const getRolesByCategory = async (categorySlug: string): Promise<Role[]> => {
  // 1. Get Category ID
  const { data: cat } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", categorySlug)
    .single();

  if (!cat) return [];

  // 2. Get Roles
  const { data } = await supabase
    .from("roles")
    .select("*")
    .eq("category_id", cat.id)
    .order("title");

  return (data || []).map((r: any) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    categorySlug: categorySlug,
  }));
};

export const getContestBySlug = async (slug: string): Promise<Contest | null> => {
  const { data: quiz } = await supabase
    .from("quizzes")
    .select(`
      *,
      role:roles (
        slug,
        category:categories (slug)
      )
    `)
    .eq("slug", slug)
    .single();

  if (!quiz) return null;

  const anyQ = quiz as any;
  return {
    id: anyQ.id,
    slug: anyQ.slug,
    title: anyQ.title,
    year: anyQ.year || "",
    description: anyQ.description || "",
    roleSlug: anyQ.role?.slug || "",
    categorySlug: anyQ.role?.category?.slug || "",
  };
};

export const getContestsByRole = async (roleSlug: string): Promise<Contest[]> => {
  const { data: role } = await supabase.from("roles").select("id, category:categories(slug)").eq("slug", roleSlug).single();
  
  if (!role) return [];

  const { data } = await supabase
    .from("quizzes")
    .select("*")
    .eq("role_id", role.id)
    .eq("is_archived", false)
    .order("year", { ascending: false });

  const anyRole = role as any;
  
  return (data || []).map((q: any) => ({
    id: q.id,
    slug: q.slug || q.id,
    title: q.title,
    year: q.year,
    description: q.description,
    roleSlug: roleSlug,
    categorySlug: anyRole.category?.slug || ""
  }));
};
