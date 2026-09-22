import React from 'react';
import { createPortal } from 'react-dom';
import { cn } from './cn';
import { Checkbox } from './Checkbox';
import { useEscapeKey } from './useEscapeKey';

/**
 * Tree — hierarchical navigation (e.g. Site → Building → Floor → Zone → Equipment).
 *
 * Hybrid of the Mantsu Figma "Tree" component (file kN9ZMAZ7NrhNp0iu8gpzEC, page
 * 42:626) and the shipping product tree (`LocationTreeNode`): chevron caret + 14px
 * text + 20px indent like the product, with the Figma hierarchy/connector lines
 * available as an opt-in (`showLines`).
 *
 * Features: title + optional subtitle, optional custom-colour status circle, optional
 * leading icon, optional selection checkboxes (tri-state), built-in search/filter,
 * right-click context menu, native drag-and-drop reordering, scroll-to-selected, full
 * keyboard navigation and ARIA (tree / treeitem / group, aria-expanded/selected/level).
 */
export interface TreeNode {
  id: string;
  /** Primary line. */
  label: string;
  /** Optional secondary line beneath the label. */
  subtitle?: string;
  /** Optional leading icon, rendered after the status circle. */
  icon?: React.ReactNode;
  /** Optional status circle colour (any CSS colour). Omit for no circle. */
  color?: string;
  /**
   * Inert: not selectable, not checkable, not draggable, and never swept up by a
   * parent's cascade check.
   *
   * This is the "this node is not a thing you can act on" flag. If what you mean is
   * "this node still exists but is retired", use `archived` — it stays selectable, which
   * is what a restore flow needs.
   */
  disabled?: boolean;
  /**
   * Retired but still real: rendered muted, and neither draggable nor a drop target,
   * but still selectable and checkable.
   *
   * Separate from `disabled` on purpose (DS-1/DS-8). An archived node must stay
   * selectable, because selecting it is how a user restores it — so an app cannot express
   * "archived" by setting `disabled`, and before this existed the only way to get the
   * muted styling was to leave the node fully draggable.
   *
   * Ordering to `disabled` is: `disabled` wins wherever they overlap.
   */
  archived?: boolean;
  children?: TreeNode[];
}

export interface TreeContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: (node: TreeNode) => void;
  /** Render in the error colour for destructive actions. */
  danger?: boolean;
}

export type DropPosition = 'before' | 'inside' | 'after';

/**
 * How a checkbox click propagates through the tree (DS-6).
 *
 * `'cascade'` (the default, and the only behaviour before DS-6) treats the tree as a
 * hierarchy of containment: checking a node checks its whole subtree, unchecking clears
 * it, and a parent reconciles to `checked` / `indeterminate` / `unchecked` from its
 * children. Right for "select this branch and everything under it".
 *
 * `'self'` treats the tree as a *browsing structure over a flat set*: a click toggles
 * exactly the clicked node, nothing else moves, and no node ever renders
 * `indeterminate`. Right when a parent and its children are independently meaningful
 * choices rather than a whole and its parts.
 *
 * The concrete case that forced this (mantsu-downtimes' reason-code assignment): a
 * machine can be assigned a parent reason WITHOUT its children. Under `'cascade'` that
 * state is not representable at all — checking the parent silently assigns every
 * descendant — so the consumer had to either fork the component or fight it.
 */
export type CheckStrategy = 'cascade' | 'self';

/**
 * Overrides for the strings this component renders itself (DS-3).
 *
 * Every key is optional and falls back to the English literal that was hardcoded before
 * this existed, so an app that passes nothing, or passes a partial object, is unchanged.
 *
 * The component holds no opinion about HOW a consumer translates: an i18n app passes
 * `t(...)` results, a single-language app passes nothing. What it must not do is force
 * every consumer into English, which is what a hardcoded literal does.
 */
export interface TreeLabels {
  /** Chevron `aria-label` when the node is collapsed. Default `'Expand'`. */
  expand?: string;
  /** Chevron `aria-label` when the node is expanded. Default `'Collapse'`. */
  collapse?: string;
  /** Shown when a search matches nothing. Default `'No results'`. */
  noResults?: string;
  /** Built-in search input placeholder and `aria-label`. Default `'Search…'`. */
  searchPlaceholder?: string;
}

const DEFAULT_LABELS: Required<TreeLabels> = {
  expand: 'Expand',
  collapse: 'Collapse',
  noResults: 'No results',
  searchPlaceholder: 'Search…',
};

export interface TreeProps {
  nodes: TreeNode[];

  /** Single selection. */
  selectedId?: string;
  onSelect?: (id: string) => void;

  /** Multi-selection checkboxes (tri-state on parents). */
  checkable?: boolean;
  checkedIds?: string[];
  defaultCheckedIds?: string[];
  onCheckedChange?: (ids: string[]) => void;

  /**
   * How a check propagates (DS-6). Defaults to `'cascade'`, the behaviour every
   * consumer had before this prop existed, so adding it changes nothing for anyone who
   * does not pass it.
   */
  checkStrategy?: CheckStrategy;

  /** Expansion (uncontrolled via defaultExpanded, or controlled via expandedIds). */
  defaultExpanded?: string[];
  expandedIds?: string[];
  onExpandedChange?: (ids: string[]) => void;

  /** Draw Figma-style connector / guide lines. Defaults to false (clean product look). */
  showLines?: boolean;

  /** Built-in search field that filters the tree and expands matching branches. */
  searchable?: boolean;
  /**
   * Placeholder for the built-in search input.
   *
   * Kept for compatibility with consumers written before `labels` existed.
   * `labels.searchPlaceholder` is the new home for this string and wins when both are
   * given; prefer it, so one component does not read the same text from two places.
   */
  searchPlaceholder?: string;

  /**
   * Controlled search query (DS-5), mirroring the `expandedIds` / `onExpandedChange`
   * pattern. When omitted, the query is internal state and behaviour is unchanged.
   *
   * Filtering runs off this value whether or not `searchable` is set: `searchable` only
   * decides whether the component renders its OWN visible input. That separation is the
   * point — it lets a consumer put the search box in its own toolbar and still get
   * identical ancestor-preserving filtering, and lets the query be reset externally (for
   * example when the thing being browsed is swapped out underneath the tree).
   */
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;

  /** Right-click context menu. Return the items for a given node (or [] to suppress). */
  contextMenuItems?: (node: TreeNode) => TreeContextMenuItem[];

  /** Enable native drag-and-drop. `onMove` receives the drag source, target and position. */
  draggable?: boolean;
  onMove?: (move: { dragId: string; targetId: string; position: DropPosition }) => void;

  /** Scroll this node into view on mount / when it changes. */
  scrollToId?: string;

  /**
   * Whether clicking a row also toggles its expansion (DS-4). Defaults to `true`, the
   * coupled behaviour this component always had.
   *
   * Set `false` when selecting a node and opening it are different intentions — a
   * master/detail screen where selecting a branch loads it into a form, say. Then the
   * chevron becomes the only way to expand, and the keyboard `Enter`/`Space` handler
   * follows the mouse rather than quietly keeping the old coupling.
   */
  expandOnSelect?: boolean;

  /**
   * `data-testid` for the outer container (DS-2).
   *
   * The per-node hooks below are always emitted and need no opt-in; this one is a prop
   * because only the consumer knows what to call the tree on its own screen.
   *
   * Every rendered row also carries generic, component-defined attributes so a consumer
   * can write stable selectors without reaching for a CSS structural or `style` selector:
   * `data-tree-node`, `data-tree-node-toggle`, `data-tree-node-checkbox` and
   * `data-tree-node-color` each hold the node's id, plus `data-tree-search` on the
   * built-in input and `data-tree-empty` on the no-results row. These are deliberately
   * NOT `data-testid`: an app's `data-testid` naming is the app's, while these name
   * parts of this component, and a shared component minting app-shaped test ids is how
   * two consumers end up fighting over one attribute.
   */
  testId?: string;

  /** Overrides for this component's own English strings (DS-3). */
  labels?: TreeLabels;

  className?: string;
}

const INDENT = 20; // px per depth level

/* ------------------------------------------------------------------ icons */

const Chevron: React.FC<{ open: boolean }> = ({ open }) => (
  <svg
    width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={cn('transition-transform duration-150', open && 'rotate-90')}
    aria-hidden
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);

/* ------------------------------------------------------------- trail lines */

type TrailVariant = 'vertical' | 'tee' | 'elbow' | 'empty';

const Trail: React.FC<{ variant: TrailVariant }> = ({ variant }) => (
  <span className="relative w-5 self-stretch shrink-0" aria-hidden>
    {variant !== 'empty' && (
      <>
        <span
          className={cn(
            'absolute left-1/2 w-px -translate-x-1/2 bg-slate-400',
            variant === 'elbow' ? 'top-0 h-1/2' : 'inset-y-0'
          )}
        />
        {(variant === 'tee' || variant === 'elbow') && (
          <span className="absolute left-1/2 right-0 top-1/2 h-px -translate-y-1/2 bg-slate-400" />
        )}
      </>
    )}
  </span>
);

/* ------------------------------------------------------------------ helpers */

interface FlatNode {
  id: string;
  hasChildren: boolean;
  depth: number;
  parentId: string | null;
}

function flatten(nodes: TreeNode[], expanded: Set<string>): FlatNode[] {
  const out: FlatNode[] = [];
  const walk = (list: TreeNode[], depth: number, parentId: string | null) => {
    for (const n of list) {
      const hasChildren = !!n.children?.length;
      out.push({ id: n.id, hasChildren, depth, parentId });
      if (hasChildren && expanded.has(n.id)) walk(n.children!, depth + 1, n.id);
    }
  };
  walk(nodes, 0, null);
  return out;
}

/**
 * Filter the tree to nodes matching `query` (or with a matching descendant), and report
 * which branches must be expanded for the matches to be visible.
 *
 * Exported (DS-5) because a consumer driving `searchQuery` from its own toolbar input
 * generally also needs the filtered shape for something else — an empty-state decision, a
 * result count, a "clear search" affordance — and the alternative to exporting it is
 * every consumer writing a second, subtly different matcher. Matching is on `label` and
 * `subtitle`, case-insensitive substring.
 */
export function filterTree(nodes: TreeNode[], query: string): { nodes: TreeNode[]; expand: Set<string> } {
  const q = query.trim().toLowerCase();
  const expand = new Set<string>();
  if (!q) return { nodes, expand };

  const matches = (n: TreeNode) =>
    n.label.toLowerCase().includes(q) || (n.subtitle?.toLowerCase().includes(q) ?? false);

  const walk = (list: TreeNode[]): TreeNode[] => {
    const kept: TreeNode[] = [];
    for (const n of list) {
      const childResult = n.children ? walk(n.children) : [];
      if (matches(n) || childResult.length) {
        if (childResult.length) expand.add(n.id);
        kept.push({ ...n, children: childResult.length ? childResult : n.children });
      }
    }
    return kept;
  };
  return { nodes: walk(nodes), expand };
}

/**
 * Every id in `node`'s subtree that a cascade check may touch, `node` included.
 *
 * A `disabled` node is skipped AND not descended into (DS-9). Before this, a direct
 * check on a disabled node was correctly refused by `Checkbox`/`TreeItem` while a check
 * on its PARENT swept it up anyway — the guard held at the point a user could see it and
 * failed everywhere else, which is the worst shape for that bug.
 *
 * Not descending is deliberate rather than incidental: a subtree hanging under a disabled
 * node is not reachable for checking by any other route either, so including its children
 * while excluding their parent would produce a state the user cannot undo from the UI.
 *
 * `archived` is NOT skipped. An archived node is still checkable; that is the whole
 * distinction between the two flags.
 */
function collectDescendantIds(node: TreeNode, into: Set<string>) {
  if (node.disabled) return;
  into.add(node.id);
  node.children?.forEach((c) => collectDescendantIds(c, into));
}

/* -------------------------------------------------------------- context menu */

const ContextMenu: React.FC<{
  x: number; y: number; items: TreeContextMenuItem[]; node: TreeNode; onClose: () => void;
}> = ({ x, y, items, node, onClose }) => {
  const ref = React.useRef<HTMLUListElement>(null);
  const [pos, setPos] = React.useState({ x, y });

  // Flip / clamp so the menu never overflows the viewport.
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const pad = 8;
    const nx = x + width > window.innerWidth - pad ? Math.max(pad, window.innerWidth - width - pad) : x;
    const ny = y + height > window.innerHeight - pad ? Math.max(pad, window.innerHeight - height - pad) : y;
    setPos({ x: nx, y: ny });
  }, [x, y]);

  // This menu is mounted only while it is open, so it is always an active
  // registrant. The stack is what keeps Escape from also closing a `Modal` or
  // `SideDrawer` the menu was opened inside.
  useEscapeKey(true, onClose);

  React.useEffect(() => {
    const close = () => onClose();
    window.addEventListener('click', close);
    window.addEventListener('contextmenu', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('contextmenu', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [onClose]);

  // Portal to <body> so no ancestor transform/overflow shifts or clips a `position: fixed` menu.
  return createPortal(
    <ul
      ref={ref}
      role="menu"
      className="fixed z-50 min-w-[180px] overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-mantsu-lg"
      style={{ top: pos.y, left: pos.x }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, i) => (
        <li key={i}>
          <button
            type="button"
            role="menuitem"
            className={cn(
              'flex w-full items-center gap-3 px-3 py-2 text-left text-body-sm hover:bg-frost',
              item.danger ? 'text-error' : 'text-midnight'
            )}
            onClick={() => { item.onClick(node); onClose(); }}
          >
            {item.icon && <span className="flex size-4 shrink-0 items-center justify-center">{item.icon}</span>}
            {item.label}
          </button>
        </li>
      ))}
    </ul>,
    document.body
  );
};

/* ----------------------------------------------------------------- tree item */

interface TreeItemProps {
  node: TreeNode;
  depth: number;
  guides: boolean[];
  isLast: boolean;
  showLines: boolean;
  checkable: boolean;
  selectedId?: string;
  focusId?: string;
  expanded: Set<string>;
  checkState: (node: TreeNode) => 'checked' | 'unchecked' | 'indeterminate';
  dndEnabled: boolean;
  dropTarget: { id: string; position: DropPosition } | null;
  expandOnSelect: boolean;
  labels: Required<TreeLabels>;
  onSelect?: (id: string) => void;
  onCheck: (node: TreeNode) => void;
  toggle: (id: string) => void;
  setFocusId: (id: string) => void;
  registerRef: (id: string, el: HTMLDivElement | null) => void;
  onContextMenu: (e: React.MouseEvent, node: TreeNode) => void;
  onDragStartNode: (id: string) => void;
  onDragOverNode: (e: React.DragEvent, node: TreeNode) => void;
  onDropNode: (node: TreeNode) => void;
  onDragEndNode: () => void;
}

const TreeItem: React.FC<TreeItemProps> = (p) => {
  const {
    node, depth, guides, isLast, showLines, checkable, selectedId, focusId, expanded,
    checkState, dndEnabled, dropTarget, expandOnSelect, labels,
    onSelect, onCheck, toggle, setFocusId, registerRef,
    onContextMenu, onDragStartNode, onDragOverNode, onDropNode, onDragEndNode,
  } = p;

  const hasChildren = !!node.children?.length;
  const isOpen = expanded.has(node.id);
  const isSelected = node.id === selectedId;
  const connector: TrailVariant = isLast ? 'elbow' : 'tee';
  const drop = dropTarget?.id === node.id ? dropTarget.position : null;
  const cs = checkable ? checkState(node) : 'unchecked';

  return (
    <li role="treeitem" aria-expanded={hasChildren ? isOpen : undefined} aria-selected={isSelected} aria-level={depth + 1}>
      <div
        ref={(el) => registerRef(node.id, el)}
        tabIndex={focusId === node.id ? 0 : -1}
        draggable={dndEnabled && !node.disabled && !node.archived}
        onFocus={() => setFocusId(node.id)}
        data-tree-node={node.id}
        onClick={() => {
          if (node.disabled) return;
          onSelect?.(node.id);
          // DS-4: expansion follows selection only when the consumer wants it to.
          if (hasChildren && expandOnSelect) toggle(node.id);
        }}
        onContextMenu={(e) => onContextMenu(e, node)}
        onDragStart={(e) => { e.stopPropagation(); onDragStartNode(node.id); }}
        onDragOver={(e) => onDragOverNode(e, node)}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDropNode(node); }}
        onDragEnd={onDragEndNode}
        className={cn(
          'group flex min-h-8 cursor-pointer items-center gap-1 rounded-sm py-1.5 pr-2 outline-none',
          'focus-visible:ring-2 focus-visible:ring-primary-blue/40',
          isSelected ? 'bg-selected-blue text-primary-blue' : 'text-primary-neutral hover:bg-slate-50',
          node.disabled && 'cursor-default opacity-50',
          // Muted, but NOT `cursor-default`: an archived node is still selectable, and
          // the cursor is what tells a user that (DS-1).
          node.archived && !node.disabled && 'opacity-60',
          drop === 'inside' && 'bg-selected-blue ring-1 ring-primary-blue/40',
          drop === 'before' && 'shadow-[inset_0_2px_0_0_#155799]',
          drop === 'after' && 'shadow-[inset_0_-2px_0_0_#155799]'
        )}
        style={!showLines ? { paddingLeft: `${depth * INDENT + 4}px` } : { paddingLeft: 4 }}
      >
        {/* Trail Zone — connector lines, one cell per ancestor level + the connector */}
        {showLines && depth > 0 && (
          <span className="flex self-stretch shrink-0">
            {guides.map((g, i) => <Trail key={i} variant={g ? 'vertical' : 'empty'} />)}
            <Trail variant={connector} />
          </span>
        )}

        {/* Chevron — toggles expansion; spacer keeps leaves aligned */}
        {hasChildren ? (
          <span
            role="button"
            tabIndex={-1}
            aria-label={isOpen ? labels.collapse : labels.expand}
            data-tree-node-toggle={node.id}
            className="flex size-5 shrink-0 items-center justify-center rounded-sm text-slate-400 hover:bg-slate-100"
            onClick={(e) => { e.stopPropagation(); toggle(node.id); }}
          >
            <Chevron open={isOpen} />
          </span>
        ) : (
          <span className="size-5 shrink-0" aria-hidden />
        )}

        {/* Checkbox */}
        {checkable && (
          <span
            onClick={(e) => e.stopPropagation()}
            data-tree-node-checkbox={node.id}
            className="flex shrink-0 items-center"
          >
            <Checkbox
              checked={cs === 'checked'}
              indeterminate={cs === 'indeterminate'}
              disabled={node.disabled}
              onChange={() => onCheck(node)}
              aria-label={node.label}
            />
          </span>
        )}

        {/* Status circle */}
        {node.color && (
          <span
            data-tree-node-color={node.id}
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: node.color }}
            aria-hidden
          />
        )}

        {/* Icon */}
        {node.icon && <span className="flex shrink-0 items-center text-slate-400">{node.icon}</span>}

        {/* Title + subtitle */}
        <span className="flex min-w-0 flex-col">
          <span className={cn('truncate text-body-sm', isSelected && 'font-semibold')}>{node.label}</span>
          {node.subtitle && <span className="truncate text-body-xs text-slate-500">{node.subtitle}</span>}
        </span>
      </div>

      {hasChildren && isOpen && (
        <ul role="group">
          {node.children!.map((child, i) => (
            <TreeItem
              {...p}
              key={child.id}
              node={child}
              depth={depth + 1}
              guides={depth === 0 ? [] : [...guides, !isLast]}
              isLast={i === node.children!.length - 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

/* ---------------------------------------------------------------------- tree */

export const Tree: React.FC<TreeProps> = ({
  nodes, selectedId, onSelect,
  checkable = false, checkedIds, defaultCheckedIds = [], onCheckedChange,
  checkStrategy = 'cascade',
  defaultExpanded = [], expandedIds, onExpandedChange,
  showLines = false, searchable = false, searchPlaceholder,
  searchQuery, onSearchQueryChange,
  contextMenuItems, draggable = false, onMove, scrollToId,
  expandOnSelect = true, testId, labels, className,
}) => {
  // `searchPlaceholder` predates `labels` and still works; `labels.searchPlaceholder`
  // wins when both are given, so a consumer migrating to `labels` does not have to
  // delete the old prop in the same commit.
  const resolvedLabels: Required<TreeLabels> = {
    ...DEFAULT_LABELS,
    ...(searchPlaceholder !== undefined ? { searchPlaceholder } : {}),
    ...labels,
  };
  /* expansion (controlled / uncontrolled) */
  const expansionControlled = expandedIds !== undefined;
  const [internalExpanded, setInternalExpanded] = React.useState(() => new Set(defaultExpanded));

  /* search (controlled via searchQuery / onSearchQueryChange, else internal) */
  const searchControlled = searchQuery !== undefined;
  const [internalQuery, setInternalQuery] = React.useState('');
  const query = searchControlled ? searchQuery : internalQuery;
  const commitQuery = (next: string) => {
    if (searchControlled) onSearchQueryChange?.(next);
    else setInternalQuery(next);
  };
  const { nodes: viewNodes, expand: searchExpand } = React.useMemo(
    () => filterTree(nodes, query),
    [nodes, query]
  );

  const baseExpanded = expansionControlled ? new Set(expandedIds) : internalExpanded;
  const expanded = React.useMemo(
    () => (query ? new Set([...baseExpanded, ...searchExpand]) : baseExpanded),
    [baseExpanded, searchExpand, query]
  );

  const commitExpanded = (next: Set<string>) => {
    if (expansionControlled) onExpandedChange?.([...next]);
    else setInternalExpanded(next);
  };
  const toggle = React.useCallback((id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    commitExpanded(next);
  }, [expanded]);
  const setExpanded = React.useCallback((id: string, open: boolean) => {
    const next = new Set(expanded);
    open ? next.add(id) : next.delete(id);
    commitExpanded(next);
  }, [expanded]);

  /* checking (controlled / uncontrolled) */
  const checkControlled = checkedIds !== undefined;
  const [internalChecked, setInternalChecked] = React.useState(() => new Set(defaultCheckedIds));
  const checked = checkControlled ? new Set(checkedIds) : internalChecked;

  const nodeIndex = React.useMemo(() => {
    const map = new Map<string, { node: TreeNode; parentId: string | null }>();
    const walk = (list: TreeNode[], parentId: string | null) => {
      for (const n of list) { map.set(n.id, { node: n, parentId }); walk(n.children ?? [], n.id); }
    };
    walk(nodes, null);
    return map;
  }, [nodes]);

  const checkState = React.useCallback((node: TreeNode): 'checked' | 'unchecked' | 'indeterminate' => {
    // DS-6: under `'self'` a node's state is its own membership of the set and nothing
    // else. `indeterminate` is not merely unused here, it is meaningless: there is no
    // whole-and-parts relationship for a parent to be partway through.
    if (checkStrategy === 'self') return checked.has(node.id) ? 'checked' : 'unchecked';

    // Disabled children are excluded here for the same reason `collectDescendantIds`
    // skips them (DS-9), and the two MUST agree. If the cascade refuses to check a
    // disabled child while this function still counts it, the parent can never reach
    // `checked`: it would sit on `indeterminate` forever and clicking it would flip
    // between indeterminate and unchecked with no way to reach checked. That is a worse
    // bug than the one DS-9 fixes, and it is only avoided by changing both together.
    const relevant = node.children?.filter((child) => !child.disabled) ?? [];
    // A node whose children are ALL disabled reads as a leaf, on its own checked state.
    if (!relevant.length) return checked.has(node.id) ? 'checked' : 'unchecked';
    const states = relevant.map(checkState);
    if (states.every((s) => s === 'checked')) return 'checked';
    if (states.every((s) => s === 'unchecked')) return 'unchecked';
    return 'indeterminate';
  }, [checked, checkStrategy]);

  const onCheck = React.useCallback((node: TreeNode) => {
    // A disabled node is never checkable, by any route. The rendered `Checkbox` already
    // refuses the pointer, but the keyboard `Enter`/`Space` handler calls straight in
    // here — so before DS-6 a disabled node COULD be toggled with the keyboard while
    // being unclickable with the mouse. Guarding at the single entry point closes both
    // paths at once and keeps this consistent with DS-9's cascade rule, rather than
    // leaving one accessibility-only hole in an otherwise enforced invariant.
    if (node.disabled) return;

    const next = new Set(checked);

    // DS-6: `'self'` toggles exactly the clicked node. No subtree walk, no ancestor
    // reconciliation — both of those are the cascade's model of containment, and
    // applying either here would silently re-introduce the behaviour this strategy
    // exists to opt out of.
    if (checkStrategy === 'self') {
      if (next.has(node.id)) next.delete(node.id);
      else next.add(node.id);
      if (checkControlled) onCheckedChange?.([...next]);
      else setInternalChecked(next);
      return;
    }

    const target = checkState(node) !== 'checked';
    const subtree = new Set<string>();
    collectDescendantIds(node, subtree);
    subtree.forEach((id) => (target ? next.add(id) : next.delete(id)));
    // reconcile ancestors so parents reflect their children
    let parentId = nodeIndex.get(node.id)?.parentId ?? null;
    while (parentId) {
      const parent = nodeIndex.get(parentId)!.node;
      const allChecked = parent.children!.every((c) => next.has(c.id));
      allChecked ? next.add(parent.id) : next.delete(parent.id);
      parentId = nodeIndex.get(parentId)?.parentId ?? null;
    }
    if (checkControlled) onCheckedChange?.([...next]);
    else setInternalChecked(next);
  }, [checked, checkState, checkStrategy, nodeIndex, checkControlled, onCheckedChange]);

  /* keyboard navigation */
  const flat = React.useMemo(() => flatten(viewNodes, expanded), [viewNodes, expanded]);
  const [focusId, setFocusId] = React.useState<string | undefined>(selectedId ?? flat[0]?.id);
  React.useEffect(() => {
    if (focusId && !flat.some((f) => f.id === focusId)) setFocusId(flat[0]?.id);
  }, [flat, focusId]);

  const refs = React.useRef(new Map<string, HTMLDivElement | null>());
  const registerRef = React.useCallback((id: string, el: HTMLDivElement | null) => {
    el ? refs.current.set(id, el) : refs.current.delete(id);
  }, []);
  const focusNode = React.useCallback((id?: string) => {
    if (!id) return;
    setFocusId(id);
    refs.current.get(id)?.focus();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!focusId) return;
    const idx = flat.findIndex((f) => f.id === focusId);
    if (idx === -1) return;
    const cur = flat[idx];
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); focusNode(flat[idx + 1]?.id); break;
      case 'ArrowUp': e.preventDefault(); focusNode(flat[idx - 1]?.id); break;
      case 'ArrowRight':
        e.preventDefault();
        if (cur.hasChildren && !expanded.has(cur.id)) setExpanded(cur.id, true);
        else if (cur.hasChildren) focusNode(flat[idx + 1]?.id);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (cur.hasChildren && expanded.has(cur.id)) setExpanded(cur.id, false);
        else if (cur.parentId) focusNode(cur.parentId);
        break;
      case 'Home': e.preventDefault(); focusNode(flat[0]?.id); break;
      case 'End': e.preventDefault(); focusNode(flat[flat.length - 1]?.id); break;
      case 'Enter': case ' ':
        e.preventDefault();
        if (checkable) onCheck(nodeIndex.get(cur.id)!.node);
        // DS-4: the keyboard path honours `expandOnSelect` exactly like the mouse path.
        // Leaving it coupled here would make a tree behave one way for pointer users and
        // another for keyboard users, which is a worse bug than the coupling itself.
        else { onSelect?.(cur.id); if (cur.hasChildren && expandOnSelect) toggle(cur.id); }
        break;
    }
  };

  /* scroll-to-selected */
  React.useEffect(() => {
    if (scrollToId) refs.current.get(scrollToId)?.scrollIntoView({ block: 'nearest' });
  }, [scrollToId]);

  /* context menu */
  const [menu, setMenu] = React.useState<{ x: number; y: number; node: TreeNode; items: TreeContextMenuItem[] } | null>(null);
  const onContextMenu = (e: React.MouseEvent, node: TreeNode) => {
    if (!contextMenuItems) return;
    const items = contextMenuItems(node);
    if (!items.length) return;
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, node, items });
  };

  /* drag and drop */
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [dropTarget, setDropTarget] = React.useState<{ id: string; position: DropPosition } | null>(null);

  const isDescendant = React.useCallback((ancestorId: string, maybeChildId: string) => {
    let cur: string | null = maybeChildId;
    while (cur) {
      if (cur === ancestorId) return true;
      cur = nodeIndex.get(cur)?.parentId ?? null;
    }
    return false;
  }, [nodeIndex]);

  const onDragOverNode = (e: React.DragEvent, node: TreeNode) => {
    // Returning BEFORE `preventDefault` is what makes the node a non-target: without the
    // preventDefault the browser refuses the drop, so no indicator is drawn and `onMove`
    // is never called. An archived node is excluded here as well as from `draggable`
    // above, because "cannot be moved" and "cannot be moved INTO" are both true of it
    // and only the first was covered before (DS-8).
    if (!draggable || !dragId || node.disabled || node.archived) return;
    if (dragId === node.id || isDescendant(dragId, node.id)) return; // can't drop onto self / own subtree
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const offset = e.clientY - rect.top;
    const position: DropPosition =
      offset < rect.height * 0.25 ? 'before' : offset > rect.height * 0.75 ? 'after' : 'inside';
    setDropTarget((prev) => (prev?.id === node.id && prev.position === position ? prev : { id: node.id, position }));
  };
  const onDropNode = (node: TreeNode) => {
    if (draggable && dragId && dropTarget && dragId !== node.id && !isDescendant(dragId, node.id)) {
      onMove?.({ dragId, targetId: node.id, position: dropTarget.position });
    }
    setDragId(null);
    setDropTarget(null);
  };
  const onDragEndNode = () => { setDragId(null); setDropTarget(null); };

  const itemShared = {
    showLines, checkable, selectedId, focusId, expanded, checkState,
    dndEnabled: draggable, dropTarget, expandOnSelect, labels: resolvedLabels,
    onSelect, onCheck, toggle, setFocusId, registerRef,
    onContextMenu, onDragStartNode: setDragId, onDragOverNode, onDropNode, onDragEndNode,
  };

  return (
    <div data-testid={testId} className={cn('flex flex-col gap-2', className)}>
      {searchable && (
        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-400" aria-hidden>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            data-tree-search
            value={query}
            onChange={(e) => commitQuery(e.target.value)}
            placeholder={resolvedLabels.searchPlaceholder}
            aria-label={resolvedLabels.searchPlaceholder}
            className="w-full bg-transparent text-body-sm text-primary-neutral outline-none placeholder:text-slate-500"
          />
        </div>
      )}

      <ul className="select-none" role="tree" aria-multiselectable={checkable || undefined} onKeyDown={onKeyDown}>
        {viewNodes.length === 0 ? (
          <li data-tree-empty className="px-2 py-3 text-body-sm text-slate-500">
            {resolvedLabels.noResults}
          </li>
        ) : (
          viewNodes.map((n, i) => (
            <TreeItem
              {...itemShared}
              key={n.id}
              node={n}
              depth={0}
              guides={[]}
              isLast={i === viewNodes.length - 1}
            />
          ))
        )}
      </ul>

      {menu && (
        <ContextMenu x={menu.x} y={menu.y} items={menu.items} node={menu.node} onClose={() => setMenu(null)} />
      )}
    </div>
  );
};

export default Tree;
