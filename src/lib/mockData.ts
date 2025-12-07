
export interface Category {
  slug: string;
  title: string;
  description: string;
}

export interface Role {
  slug: string;
  title: string;
  categorySlug: string;
}

export interface Contest {
  slug: string;
  title: string;
  year: string;
  roleSlug: string;
  categorySlug: string;
  description: string;
}

export const categories: Category[] = [
  {
    slug: "guardia-di-finanza",
    title: "Guardia di Finanza",
    description: "La Guardia di Finanza è un corpo militare con funzioni di polizia economico-finanziaria, impegnato nella tutela delle finanze pubbliche."
  },
  {
    slug: "polizia-di-stato",
    title: "Polizia di Stato",
    description: "Corpo civile di polizia ad ordinamento speciale per la tutela dell'ordine e della sicurezza pubblica."
  }
];

export const roles: Role[] = [
  { slug: "allievi", title: "Allievi", categorySlug: "guardia-di-finanza" },
  { slug: "ufficiale", title: "Ufficiale", categorySlug: "guardia-di-finanza" },
  { slug: "maresciallo", title: "Maresciallo", categorySlug: "guardia-di-finanza" },
  { slug: "baschi-verdi", title: "Baschi Verdi", categorySlug: "guardia-di-finanza" }
];

export const contests: Contest[] = [
  {
    slug: "allievo-maresciallo-2025",
    title: "Allievo Maresciallo della Guardia di Finanza 2025",
    year: "2025",
    roleSlug: "maresciallo",
    categorySlug: "guardia-di-finanza",
    description: "Concorso pubblico per esami finalizzato al reclutamento di 1.198 unità di personale non dirigenziale."
  }
];

export const getCategory = (slug: string) => categories.find(c => c.slug === slug);
export const getRolesByCategory = (catSlug: string) => roles.filter(r => r.categorySlug === catSlug);
export const getContestsByRole = (roleSlug: string) => contests.filter(c => c.roleSlug === roleSlug);
export const getContest = (slug: string) => contests.find(c => c.slug === slug);
