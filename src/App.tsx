import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import HomePage from './app/page';
import LoginPage from './app/login/page';


import ConcorsoHubPage from './app/concorsi/[category]/page';
import RolePage from './app/concorsi/[category]/[role]/page';

// Placeholder components for routes we haven't refactored yet
import ContestPage from './app/concorsi/[category]/[role]/[contestSlug]/page';
import SimulationTypePage from './app/concorsi/[category]/[role]/[contestSlug]/simulazione/page';
import QuizRulesPage from './app/concorsi/[category]/[role]/[contestSlug]/simulazione/[type]/regole/page';
import CustomQuizWizardPage from './app/concorsi/[category]/[role]/[contestSlug]/custom/page';

import QuizRunnerPage from './app/quiz/run/[attemptId]/page';
import QuizResultsPage from './app/quiz/results/[attemptId]/page';
import ExplanationPage from './app/quiz/explanations/[attemptId]/[questionId]/page';
import StatsPage from './app/stats/page';

// Admin Pages (Lazy Loaded for Code Splitting)
const AdminDashboardPage = React.lazy(() => import('./app/admin/dashboard/page'));
const AdminQuestionsPage = React.lazy(() => import('./app/admin/page'));
const AdminStructurePage = React.lazy(() => import('./app/admin/structure/page'));
const AdminCategoryEditPage = React.lazy(() => import('./app/admin/structure/categories/[id]/page'));
const AdminRoleEditPage = React.lazy(() => import('./app/admin/structure/roles/[id]/page'));
const AdminQuizListPage = React.lazy(() => import('./app/admin/quiz/QuizListPage'));
const AdminSubjectsListPage = React.lazy(() => import('./app/admin/quiz/SubjectsListPage'));
const AdminQuestionEditPage = React.lazy(() => import('./app/admin/questions/[id]/page'));
const AdminImagesPage = React.lazy(() => import('./app/admin/images/page'));
const AdminUploadCsvPage = React.lazy(() => import('./app/admin/upload-csv/page'));
const AdminRulesPage = React.lazy(() => import('./app/admin/rules/page'));
const AdminLeaderboardPage = React.lazy(() => import('./app/admin/leaderboard/page'));

// Blog Admin (Lazy Loaded)
const AdminBlogListPage = React.lazy(() => import('./app/admin/blog/page'));
const AdminBlogEditorPage = React.lazy(() => import('./app/admin/blog/editor/page'));
const AdminBlogCategoriesPage = React.lazy(() => import('./app/admin/blog/categories/page'));
const AdminBlogTagsPage = React.lazy(() => import('./app/admin/blog/tags/page'));

// Blog (User-facing)
import BlogIndexPage from './app/blog/page';
import BlogPostPage from './app/blog/[slug]/page';

import LeaderboardPage from './app/leaderboard/page';


import { AuthProvider } from './context/AuthContext';
import { SidebarProvider } from './context/SidebarContext';
import ProfilePage from './app/profile/page';
import ProfileSettingsPage from './app/profile/settings/page';
import QuizStatsPage from './app/profile/stats/QuizStatsPage';

import MainLayout from './components/layout/MainLayout';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Loading fallback for lazy-loaded components
const AdminLoading = () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Caricamento...</p>
        </div>
    </div>
);

export default function App() {
    return (
        <BrowserRouter>
            <ErrorBoundary>
                <AuthProvider>
                    <SidebarProvider>
                        <Routes>
                            <Route path="/login" element={<LoginPage />} />

                            {/* Main App Layout */}
                            <Route path="/" element={
                                <MainLayout>
                                    <HomePage />
                                </MainLayout>
                            } />

                            <Route path="/profile" element={
                                <MainLayout>
                                    <ProfilePage />
                                </MainLayout>
                            } />
                            <Route path="/profile/settings" element={
                                <MainLayout>
                                    <ProfileSettingsPage />
                                </MainLayout>
                            } />
                            <Route path="/profile/stats/:quizId" element={
                                <MainLayout>
                                    <QuizStatsPage />
                                </MainLayout>
                            } />

                            {/* Concorsi Flow (Wrapped) */}
                            <Route path="/concorsi/:category" element={<MainLayout><ConcorsoHubPage /></MainLayout>} />
                            <Route path="/concorsi/:category/:role" element={<MainLayout><RolePage /></MainLayout>} />
                            <Route path="/concorsi/:category/:role/:contestSlug" element={<MainLayout><ContestPage /></MainLayout>} />
                            <Route path="/concorsi/:category/:role/:contestSlug/simulazione" element={<MainLayout><SimulationTypePage /></MainLayout>} />
                            <Route path="/concorsi/:category/:role/:contestSlug/simulazione/:type/regole" element={<MainLayout><QuizRulesPage /></MainLayout>} />
                            <Route path="/concorsi/:category/:role/:contestSlug/custom" element={<MainLayout><CustomQuizWizardPage /></MainLayout>} />

                            {/* Quiz Engine (Wrapped) */}
                            <Route path="/quiz/:id/official" element={<MainLayout><QuizRunnerPage /></MainLayout>} />
                            <Route path="/quiz/run/:attemptId" element={<MainLayout><QuizRunnerPage /></MainLayout>} />
                            <Route path="/quiz/results/:attemptId" element={<MainLayout><QuizResultsPage /></MainLayout>} />
                            <Route path="/quiz/explanations/:attemptId/:questionId" element={<MainLayout><ExplanationPage /></MainLayout>} />
                            {/* <Route path="/stats" element={<MainLayout><StatsPage /></MainLayout>} /> */}

                            {/* Blog (User-facing) (Wrapped) */}
                            <Route path="/blog" element={<MainLayout><BlogIndexPage /></MainLayout>} />
                            <Route path="/blog/:slug" element={<MainLayout><BlogPostPage /></MainLayout>} />
                            <Route path="/leaderboard" element={<MainLayout><LeaderboardPage /></MainLayout>} />

                            {/* Admin - Lazy loaded with Suspense */}
                            <Route element={
                                <Suspense fallback={<AdminLoading />}>
                                    <Outlet />
                                </Suspense>
                            }>
                                <Route path="/admin" element={<AdminDashboardPage />} />
                                <Route path="/admin/questions" element={<AdminQuestionsPage />} />
                                <Route path="/admin/structure" element={<AdminStructurePage />} />
                                <Route path="/admin/structure/categories/:id" element={<AdminCategoryEditPage />} />
                                <Route path="/admin/structure/roles/:id" element={<AdminRoleEditPage />} />
                                <Route path="/admin/quiz" element={<AdminQuizListPage />} />
                                <Route path="/admin/quiz/materie" element={<AdminSubjectsListPage />} />
                                <Route path="/admin/questions/:id" element={<AdminQuestionEditPage />} />
                                <Route path="/admin/images" element={<AdminImagesPage />} />
                                <Route path="/admin/upload-csv" element={<AdminUploadCsvPage />} />
                                <Route path="/admin/stats" element={<StatsPage />} />
                                <Route path="/admin/leaderboard" element={<AdminLeaderboardPage />} />

                                {/* Admin Blog */}
                                <Route path="/admin/blog" element={<AdminBlogListPage />} />
                                <Route path="/admin/blog/categorie" element={<AdminBlogCategoriesPage />} />
                                <Route path="/admin/blog/tag" element={<AdminBlogTagsPage />} />
                                <Route path="/admin/blog/nuovo" element={<AdminBlogEditorPage />} />
                                <Route path="/admin/blog/:id" element={<AdminBlogEditorPage />} />
                            </Route>
                        </Routes>
                    </SidebarProvider>
                </AuthProvider>
            </ErrorBoundary>
        </BrowserRouter>
    );
}

