'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  GitBranch,
  Search,
  RefreshCcw,
  Play,
  Pencil,
  Trash2,
  XCircle,
  Loader2,
  Zap,
  Users,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import workflowService, { Workflow, ProcessStatusResponse } from '../../services/workflow';
import { storeWorkflowJson } from '@/utils/workflowStorage';
import { toast } from 'react-hot-toast';
import { useTheme } from '../../contexts/ThemeContext';
import CreateWorkflowDialog from '../../components/workflows/CreateWorkflowDialog';

// ─── Types ──────────────────────────────────────────────────────────────────

interface WorkflowWithStatus extends Workflow {
  processStatus?: ProcessStatusResponse;
}

// ─── Color palettes for workflow cards ──────────────────────────────────────

const PALETTES = [
  { from: '#6366f1', to: '#8b5cf6', light: 'from-indigo-500 to-violet-500', bg: 'bg-indigo-50', text: 'text-indigo-600', darkBg: 'bg-indigo-500/10', darkText: 'text-indigo-400' },
  { from: '#3b82f6', to: '#06b6d4', light: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50', text: 'text-blue-600', darkBg: 'bg-blue-500/10', darkText: 'text-blue-400' },
  { from: '#10b981', to: '#14b8a6', light: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', text: 'text-emerald-600', darkBg: 'bg-emerald-500/10', darkText: 'text-emerald-400' },
  { from: '#f59e0b', to: '#f97316', light: 'from-amber-500 to-orange-500', bg: 'bg-amber-50', text: 'text-amber-600', darkBg: 'bg-amber-500/10', darkText: 'text-amber-400' },
  { from: '#ec4899', to: '#f43f5e', light: 'from-pink-500 to-rose-500', bg: 'bg-pink-50', text: 'text-pink-600', darkBg: 'bg-pink-500/10', darkText: 'text-pink-400' },
  { from: '#8b5cf6', to: '#a855f7', light: 'from-violet-500 to-purple-500', bg: 'bg-violet-50', text: 'text-violet-600', darkBg: 'bg-violet-500/10', darkText: 'text-violet-400' },
];

function getPalette(name: string) {
  const hash = name.split('').reduce((acc, c) => c.charCodeAt(0) + acc, 0);
  return PALETTES[hash % PALETTES.length];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getAgentCount(workflow: Workflow): number {
  return (workflow.nodes ?? []).filter((n) => n.node_type === 'agent').length;
}

function getNodeCount(workflow: Workflow): number {
  return (workflow.nodes ?? []).length;
}

function getEdgeCount(workflow: Workflow): number {
  return (workflow.edges ?? []).length;
}

function getStatus(workflow: WorkflowWithStatus): { label: string; active: boolean } {
  const running =
    workflow.processStatus?.status === 'running' &&
    workflow.processStatus?.is_workflow_subprocess;
  return running ? { label: 'Active', active: true } : { label: 'Inactive', active: false };
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD < 7) return `${diffD}d ago`;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Mini Flow Visualization ────────────────────────────────────────────────

function MiniFlowViz({ workflow, palette }: { workflow: Workflow; palette: typeof PALETTES[0] }) {
  const nodes = workflow.nodes ?? [];
  const total = Math.min(nodes.length, 6);
  if (total === 0) return null;

  return (
    <div className="flex items-center gap-1 mt-3">
      {Array.from({ length: total }).map((_, i) => (
        <React.Fragment key={i}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 + i * 0.08, type: 'spring', stiffness: 300 }}
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: i === 0 || i === total - 1 ? palette.from : `${palette.from}80` }}
          />
          {i < total - 1 && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.35 + i * 0.08 }}
              className="w-3 h-0.5 rounded-full"
              style={{ background: `${palette.from}40` }}
            />
          )}
        </React.Fragment>
      ))}
      {nodes.length > 6 && (
        <span className="text-[10px] ml-1 opacity-50">+{nodes.length - 6}</span>
      )}
    </div>
  );
}

// ─── Page Component ─────────────────────────────────────────────────────────

const WorkflowsPage: NextPage = () => {
  const { darkMode } = useTheme();
  const router = useRouter();

  const [workflows, setWorkflows] = useState<WorkflowWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [runLoadingId, setRunLoadingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  // ── Fetch ──

  const fetchProcessStatuses = (workflowsData: Workflow[]) => {
    const updated = workflowsData.map((w) => ({
      ...w,
      processStatus: { status: 'unknown', message: 'Status checking disabled' },
    })) as WorkflowWithStatus[];
    setWorkflows(updated);
  };

  const fetchWorkflows = useCallback(async (forceRefresh = false) => {
    const cached = !forceRefresh && workflowService.getCachedWorkflows();
    if (cached && cached.length >= 0) {
      const withStatus = cached.map((w) => ({
        ...w,
        processStatus: { status: 'unknown' as const, message: 'Updating...' },
      }));
      setWorkflows(withStatus);
      setLoading(false);
      setError(null);
      workflowService
        .getWorkflowsFresh()
        .then((data) => fetchProcessStatuses(data))
        .catch(() => {});
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = forceRefresh
        ? await workflowService.getWorkflowsFresh()
        : await workflowService.getWorkflows();
      fetchProcessStatuses(data);
    } catch {
      setError('Failed to load workflows.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  // ── Filtering ──

  const filteredWorkflows = useMemo(() => {
    if (!searchTerm) return workflows;
    const q = searchTerm.toLowerCase();
    return workflows.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        (w.description && w.description.toLowerCase().includes(q))
    );
  }, [workflows, searchTerm]);

  // ── Stats ──

  const totalAgents = useMemo(
    () => workflows.reduce((sum, w) => sum + getAgentCount(w), 0),
    [workflows]
  );

  const activeCount = useMemo(
    () => workflows.filter((w) => getStatus(w).active).length,
    [workflows]
  );

  // ── Actions ──

  const handleRun = async (workflow: WorkflowWithStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    setRunLoadingId(workflow.id);
    try {
      const workflowJson = await workflowService.generateWorkflowJsonFromDb(workflow.id);
      storeWorkflowJson(workflow.id, workflowJson);
      router.push(`/runworkflow?workflowId=${workflow.id}`);
    } catch {
      toast.error('Failed to prepare workflow');
    } finally {
      setRunLoadingId(null);
    }
  };

  const handleDelete = async (workflowId: string) => {
    try {
      await workflowService.deleteWorkflow(workflowId);
      setWorkflows((prev) => prev.filter((w) => w.id !== workflowId));
      setDeleteConfirmId(null);
      toast.success('Workflow deleted');
    } catch {
      toast.error('Failed to delete workflow');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <MainLayout>
      <div className={`min-h-screen ${darkMode ? 'bg-gray-950' : 'bg-slate-50'}`}>
        {/* ── Gradient Header ── */}
        <div className="relative overflow-hidden">
          <div
            className={`absolute inset-0 ${
              darkMode
                ? 'bg-gradient-to-br from-blue-950/80 via-gray-950 to-violet-950/60'
                : 'bg-gradient-to-br from-blue-50 via-white to-violet-50'
            }`}
          />
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className={`absolute -top-20 -right-20 w-96 h-96 rounded-full blur-3xl ${
                darkMode ? 'bg-blue-500/5' : 'bg-blue-200/30'
              }`}
            />
            <motion.div
              animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
              transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
              className={`absolute -bottom-20 -left-20 w-80 h-80 rounded-full blur-3xl ${
                darkMode ? 'bg-violet-500/5' : 'bg-violet-200/20'
              }`}
            />
          </div>

          <div className="relative max-w-7xl mx-auto px-6 pt-8 pb-6">
            {/* Title row */}
            <div className="flex items-center justify-between mb-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3"
              >
                <div
                  className={`p-2.5 rounded-xl ${
                    darkMode
                      ? 'bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-blue-500/20'
                      : 'bg-gradient-to-br from-blue-100 to-violet-100 border border-blue-200/50'
                  }`}
                >
                  <GitBranch size={22} className={darkMode ? 'text-blue-400' : 'text-blue-600'} />
                </div>
                <div>
                  <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Workflows
                  </h1>
                  <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    Multi-agent conversation flows
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-3"
              >
                {/* Search */}
                <motion.div
                  animate={{ width: searchFocused ? 280 : 200 }}
                  className="relative"
                >
                  <Search
                    size={16}
                    className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                      searchFocused
                        ? 'text-blue-500'
                        : darkMode
                        ? 'text-gray-600'
                        : 'text-gray-400'
                    }`}
                  />
                  <input
                    type="text"
                    placeholder="Search workflows..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border transition-all ${
                      searchFocused
                        ? darkMode
                          ? 'bg-gray-800 border-blue-500/50 text-white ring-2 ring-blue-500/20'
                          : 'bg-white border-blue-300 text-gray-900 ring-2 ring-blue-100 shadow-lg shadow-blue-100/50'
                        : darkMode
                        ? 'bg-gray-900/80 border-gray-700 text-white placeholder-gray-600'
                        : 'bg-white/80 border-gray-200 text-gray-900 placeholder-gray-400'
                    }`}
                  />
                </motion.div>

                <motion.button
                  whileHover={{ rotate: 180 }}
                  transition={{ duration: 0.4 }}
                  onClick={() => fetchWorkflows(true)}
                  className={`p-2.5 rounded-xl border transition-colors ${
                    darkMode
                      ? 'border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800 hover:border-gray-600'
                      : 'border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-white hover:shadow-sm'
                  }`}
                  title="Refresh"
                >
                  <RefreshCcw size={16} />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowCreateDialog(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-violet-700 shadow-lg shadow-blue-500/25 transition-all"
                >
                  <Plus size={16} />
                  New Workflow
                </motion.button>
              </motion.div>
            </div>

            {/* Stats row */}
            {!loading && workflows.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="flex gap-4"
              >
                {[
                  {
                    label: 'Total',
                    value: workflows.length,
                    icon: <GitBranch size={15} />,
                    color: darkMode ? 'text-blue-400' : 'text-blue-600',
                    bg: darkMode ? 'bg-blue-500/10' : 'bg-blue-50',
                  },
                  {
                    label: 'Active',
                    value: activeCount,
                    icon: <Zap size={15} />,
                    color: darkMode ? 'text-emerald-400' : 'text-emerald-600',
                    bg: darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50',
                  },
                  {
                    label: 'Agents',
                    value: totalAgents,
                    icon: <Users size={15} />,
                    color: darkMode ? 'text-violet-400' : 'text-violet-600',
                    bg: darkMode ? 'bg-violet-500/10' : 'bg-violet-50',
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className={`flex items-center gap-2.5 px-4 py-2 rounded-xl ${
                      darkMode
                        ? 'bg-gray-900/60 border border-gray-800'
                        : 'bg-white/70 border border-gray-100 shadow-sm'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${stat.bg}`}>
                      <span className={stat.color}>{stat.icon}</span>
                    </div>
                    <div>
                      <div className={`text-lg font-bold leading-none ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {stat.value}
                      </div>
                      <div className={`text-[10px] uppercase tracking-wider font-medium ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {stat.label}
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="max-w-7xl mx-auto px-6 py-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`rounded-2xl border p-5 space-y-3 animate-pulse ${
                    darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
                  }`}
                >
                  <div className={`h-1.5 rounded-full w-full ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`} />
                  <div className={`h-5 rounded w-2/3 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`} />
                  <div className={`h-4 rounded w-1/2 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`} />
                  <div className="flex gap-2 pt-2">
                    <div className={`h-6 rounded-full w-16 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`} />
                    <div className={`h-6 rounded-full w-12 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`} />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`rounded-2xl border p-16 text-center ${
                darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'
              }`}
            >
              <XCircle size={40} className={`mx-auto mb-4 ${darkMode ? 'text-red-400' : 'text-red-500'}`} />
              <p className={`text-sm mb-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{error}</p>
              <button
                onClick={() => fetchWorkflows(true)}
                className="px-5 py-2.5 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </motion.div>
          ) : filteredWorkflows.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl border p-20 text-center relative overflow-hidden ${
                darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
                  className={`absolute top-10 right-10 w-32 h-32 rounded-full border-2 border-dashed ${
                    darkMode ? 'border-gray-800' : 'border-gray-100'
                  }`}
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
                  className={`absolute bottom-10 left-10 w-24 h-24 rounded-full border-2 border-dashed ${
                    darkMode ? 'border-gray-800' : 'border-gray-100'
                  }`}
                />
              </div>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 ${
                  darkMode
                    ? 'bg-gradient-to-br from-blue-500/20 to-violet-500/20'
                    : 'bg-gradient-to-br from-blue-50 to-violet-50'
                }`}
              >
                <Sparkles size={32} className={darkMode ? 'text-blue-400' : 'text-blue-500'} />
              </motion.div>
              <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {searchTerm ? 'No workflows found' : 'Build something amazing'}
              </h3>
              <p className={`text-sm max-w-md mx-auto mb-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {searchTerm
                  ? `No workflows match "${searchTerm}".`
                  : 'Create your first multi-agent workflow and watch your AI agents collaborate.'}
              </p>
              {searchTerm ? (
                <button
                  onClick={() => setSearchTerm('')}
                  className={`px-4 py-2 text-sm rounded-xl border transition-all ${
                    darkMode ? 'border-gray-700 text-gray-400 hover:bg-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Clear Search
                </button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowCreateDialog(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-violet-700 shadow-lg shadow-blue-500/25 transition-all"
                >
                  <Plus size={16} />
                  Create Your First Workflow
                  <ArrowRight size={16} />
                </motion.button>
              )}
            </motion.div>
          ) : (
            /* ── Workflow Cards Grid ── */
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.06 } },
              }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              <AnimatePresence mode="popLayout">
                {filteredWorkflows.map((workflow) => {
                  const palette = getPalette(workflow.name);
                  const status = getStatus(workflow);
                  const agentCount = getAgentCount(workflow);
                  const isHovered = hoveredId === workflow.id;
                  const isDeleting = deleteConfirmId === workflow.id;

                  return (
                    <motion.div
                      key={workflow.id}
                      layout
                      variants={{
                        hidden: { opacity: 0, y: 20, scale: 0.97 },
                        visible: { opacity: 1, y: 0, scale: 1 },
                      }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      whileHover={{ y: -4 }}
                      onHoverStart={() => {
                        setHoveredId(workflow.id);
                        router.prefetch(`/workflows/${workflow.id}/edit`);
                      }}
                      onHoverEnd={() => setHoveredId(null)}
                      onClick={() => router.push(`/workflows/${workflow.id}/edit`)}
                      className={`relative group rounded-2xl border cursor-pointer transition-shadow duration-300 overflow-hidden ${
                        darkMode
                          ? 'bg-gray-900 border-gray-800 hover:border-gray-700 hover:shadow-2xl hover:shadow-blue-500/5'
                          : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-xl hover:shadow-blue-100/50'
                      }`}
                    >
                      {/* Gradient top bar */}
                      <div
                        className={`h-1.5 bg-gradient-to-r ${palette.light}`}
                      />

                      {/* Glow on hover */}
                      <motion.div
                        animate={{ opacity: isHovered ? 1 : 0 }}
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: `radial-gradient(ellipse at top, ${palette.from}08 0%, transparent 70%)`,
                        }}
                      />

                      <div className="relative p-5">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3
                              className={`text-base font-bold truncate ${
                                darkMode ? 'text-white' : 'text-gray-900'
                              }`}
                            >
                              {workflow.name}
                            </h3>
                            {workflow.description && (
                              <p
                                className={`text-xs mt-0.5 truncate ${
                                  darkMode ? 'text-gray-500' : 'text-gray-400'
                                }`}
                              >
                                {workflow.description}
                              </p>
                            )}
                          </div>

                          {/* Status badge */}
                          <div
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                              status.active
                                ? darkMode
                                  ? 'bg-emerald-500/15 text-emerald-400'
                                  : 'bg-emerald-50 text-emerald-600'
                                : darkMode
                                ? 'bg-gray-800 text-gray-500'
                                : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                status.active ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'
                              }`}
                            />
                            {status.label}
                          </div>
                        </div>

                        {/* Mini flow visualization */}
                        <MiniFlowViz workflow={workflow} palette={palette} />

                        {/* Stats chips */}
                        <div className="flex items-center gap-2 mt-4">
                          <div
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                              darkMode ? palette.darkBg + ' ' + palette.darkText : palette.bg + ' ' + palette.text
                            }`}
                          >
                            <Users size={12} />
                            {agentCount} agent{agentCount !== 1 ? 's' : ''}
                          </div>
                          <div
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs ${
                              darkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-50 text-gray-400'
                            }`}
                          >
                            <Clock size={12} />
                            {formatDate(workflow.updated_at)}
                          </div>
                        </div>

                        {/* Action buttons - slide in on hover */}
                        <motion.div
                          initial={false}
                          animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 8 }}
                          transition={{ duration: 0.2 }}
                          className={`flex items-center justify-between mt-4 pt-4 border-t ${
                            darkMode ? 'border-gray-800' : 'border-gray-100'
                          }`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isDeleting ? (
                            <div className="flex items-center gap-2 w-full">
                              <span className={`text-xs flex-1 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                                Delete this workflow?
                              </span>
                              <button
                                onClick={() => handleDelete(workflow.id)}
                                className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                                  darkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100'
                                }`}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={(e) => handleRun(workflow, e)}
                                disabled={runLoadingId === workflow.id}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                  darkMode
                                    ? 'text-emerald-400 hover:bg-emerald-500/10'
                                    : 'text-emerald-600 hover:bg-emerald-50'
                                }`}
                              >
                                {runLoadingId === workflow.id ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <Play size={13} />
                                )}
                                Run
                              </button>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/workflows/${workflow.id}/edit`);
                                  }}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    darkMode
                                      ? 'text-gray-500 hover:text-blue-400 hover:bg-blue-500/10'
                                      : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                                  }`}
                                  title="Edit"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirmId(workflow.id);
                                  }}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    darkMode
                                      ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/10'
                                      : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                                  }`}
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </>
                          )}
                        </motion.div>

                        {/* Always-visible minimal action area when not hovered */}
                        <motion.div
                          initial={false}
                          animate={{ opacity: isHovered ? 0 : 1, y: isHovered ? -8 : 0 }}
                          transition={{ duration: 0.2 }}
                          className={`flex items-center justify-end mt-3 ${isHovered ? 'pointer-events-none absolute bottom-5 right-5' : ''}`}
                        >
                          <span
                            className={`text-[11px] flex items-center gap-1 ${
                              darkMode ? 'text-gray-600' : 'text-gray-300'
                            }`}
                          >
                            Click to open
                            <ArrowRight size={11} />
                          </span>
                        </motion.div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      <CreateWorkflowDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />
    </MainLayout>
  );
};

export default WorkflowsPage;
