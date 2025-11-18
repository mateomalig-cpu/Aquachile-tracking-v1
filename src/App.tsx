import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Package,
  Warehouse,
  FileText,
  Layers,
  Plus,
  X,
  PieChart as PieChartIcon,
  ClipboardList,
  AlertTriangle,
  Mail,
  Archive,
  Undo,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

// =====================================================================
// UTILIDADES GLOBALES
// =====================================================================
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const uid = () => Math.random().toString(36).slice(2);

// =====================================================================
// DEFINICIÓN DE TIPOS Y ESTADOS
// =====================================================================

export type TrackingStatus = "CONFIRMADO" | "EN_TRANSITO" | "LISTO_ENTREGA" | "ENTREGADO" | "RETRASO" | "INCIDENCIA";
type AssignmentTipo = "ORDEN" | "SPOT";
type AssignmentEstado = "ACTIVA" | "ANULADA";
type TabId = "dashboard" | "inventory" | "orders" | "assignments" | "categories" | "warehouse" | "clientUpdate";

type InventoryRow = {
  id: string;
  ubicacion: string;
  bodega: string;
  planta: string;
  produccion: string;
  eta: string;
  po: string;
  customerPO: string; 
  time: string;
  awb: string | null;
  clientePrincipal: string;
  clientes: string[];
  material: string;
  descripcion: string;
  producto: string;
  sector: string;
  trim: string;
  size: string;
  escamas: string | null;
  formatoCaja: number;
  totalLbs: number;
  empacado: string;
  cajasOrden: number;
  cajasInv: number;
  activo: boolean;
  fechaCierre?: string;
  status: TrackingStatus;
  statusHistory: { at: string; status: TrackingStatus }[];
  trackingToken: string;
};

type OrderItem = { inventoryId: string; po: string; material: string; producto: string; cajas: number; };

type SalesOrder = { id: string; salesRep: string; demandId: string; tos: string; shipTo: string; pickUpDate: string; brand1: string; material: string; description: string; cases: number; price: number; flex: string; incoterm: string; truck: string; customerPO: string; portEntry: string; week: string; estadoAprobacion: string; estadoProgreso: string; unidadPrecio: string; orden: string; estadoPlanificacion: string; especie: string; especieDescripcion: string; estadoDetPrecio: string; incoterms2: string; brand: string; };

interface Assignment {
  id: string;
  fecha: string;
  tipo: AssignmentTipo;
  salesOrderId?: string;
  spotCliente?: string;
  spotRef?: string;
  cliente: string;
  estado: AssignmentEstado;
  items: OrderItem[];
}

type DashboardAgg = {
  byWarehouse: { bodega: string; totalCajas: number; totalLbs: number }[];
  byStatus: { status: string; cajas: number }[];
  assignmentsByStatus: { status: string; count: number }[];
};

// =====================================================================
// DATOS DE EJEMPLO Y PERSISTENCIA
// =====================================================================

const INVENTORY_LS_KEY = "inventory_v3";
const ASSIGNMENTS_LS_KEY = "assignments_v3";
const SALES_ORDERS_LS_KEY = "sales_orders_v1"; // <-- NUEVA LÍNEA

// =====================================================================
// CONFIGURACIÓN DE NOTIFICACIONES Y DATOS
// =====================================================================

const clientDirectory: Record<string, { email: string }> = {
  "AquaChile MIA": { email: "customer@example.com" },
  "Santa Monica": { email: "santa.monica@example.com" },
};

const STATUS_LABELS: Record<TrackingStatus, string> = {
  CONFIRMADO: "Confirmed",
  EN_TRANSITO: "In Transit",
  LISTO_ENTREGA: "Ready for Delivery",
  ENTREGADO: "Delivered",
  RETRASO: "Delayed",
  INCIDENCIA: "Issue Reported",
};

function composeTrackingEmailHTML(inventoryRow: InventoryRow): string {
  const statusLabel = STATUS_LABELS[inventoryRow.status] || inventoryRow.status;
  const trackingLink = getTrackingLink(inventoryRow);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f7f6;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td align="center">
            <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding: 20px; background-color: #0c2c4d; color: #ffffff;" align="center">
                  <img src="/aquachile_logo.png" alt="AquaChile Logo" style="height: 40px; margin-bottom: 10px;">
                  <h1 style="margin: 0; font-size: 24px;">Order Status Update</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px;">
                  <p style="font-size: 16px; color: #333;">Dear ${inventoryRow.clientePrincipal},</p>
                  <p style="font-size: 16px; color: #333;">This is an update regarding your shipment. The current status is now:</p>
                  <div style="padding: 15px; background-color: #eaf6ff; border-left: 4px solid #007bff; margin: 20px 0; font-size: 18px; font-weight: bold; color: #007bff;">
                    ${statusLabel}
                  </div>
                  <p style="font-size: 16px; color: #333;">Details of the shipment:</p>
                  <ul style="list-style: none; padding: 0; font-size: 14px; color: #555;">
                    <li style="padding: 5px 0;"><strong>PO:</strong> ${inventoryRow.customerPO}</li>
                    <li style="padding: 5px 0;"><strong>Material:</strong> ${inventoryRow.material}</li>
                    <li style="padding: 5px 0;"><strong>ETA:</strong> ${inventoryRow.eta}</li>
                  </ul>
                  <p style="font-size: 16px; text-align: center; margin-top: 30px;">
                    <a href="${trackingLink}" style="background-color: #007bff; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                      View Live Tracking
                    </a>
                  </p>
                </td>
              </tr>
              <tr style="background-color: #f4f7f6;">
                <td style="padding: 20px; text-align: center; font-size: 12px; color: #888;">
                  This is an automated notification. Please do not reply to this email.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

const sampleInventoryData: InventoryRow[] = [
  { id: "row-1", ubicacion: "Miami, FL", bodega: "MIA-1", planta: "Magallanes", produccion: "2025-11-03", eta: "2025-11-10", po: "40538940", customerPO: "PO-AC-001", time: "AM", awb: null, clientePrincipal: "AquaChile MIA", clientes: ["AquaChile MIA"], material: "1113199", descripcion: "SA TD Pr 4-5 LB#Bo Cp 35LB AQ", producto: "TD 4-5 35", sector: "SA", trim: "TD", size: "4-5", escamas: null, formatoCaja: 35, totalLbs: 175 * 35, empacado: "FILETES", cajasOrden: 175, cajasInv: 175, activo: true, status: "EN_TRANSITO", statusHistory: [{ at: new Date().toISOString(), status: "CONFIRMADO" }, { at: new Date().toISOString(), status: "EN_TRANSITO" }], trackingToken: uid() },
  { id: "row-3", ubicacion: "Miami, FL", bodega: "MIA-2", planta: "Cardonal", produccion: "2025-11-04", eta: "2025-11-12", po: "40538656", customerPO: "PO-SM-002", time: "PM", awb: "123-45678901", clientePrincipal: "Santa Monica", clientes: ["Santa Monica"], material: "1113198", descripcion: "SA TD Pr 3-4 LB#Bo Cp 35LB AQ", producto: "TD 3-4 35", sector: "SA", trim: "TD", size: "3-4", escamas: "Se", formatoCaja: 35, totalLbs: 65 * 35, empacado: "FILETES", cajasOrden: 65, cajasInv: 65, activo: true, status: "CONFIRMADO", statusHistory: [{ at: new Date().toISOString(), status: "CONFIRMADO" }], trackingToken: uid() },
];

const sampleSalesOrders: SalesOrder[] = [ { id: "DEM-1001", salesRep: "Juan Pérez", demandId: "DEM-1001", tos: "FOB", shipTo: "AquaChile MIA", pickUpDate: "2025-11-12", brand1: "AquaChile", material: "1113199", description: "SA TD Pr 4-5 LB#Bo Cp 35LB AQ", cases: 120, price: 5.4, flex: "Sí", incoterm: "FOB MIA", truck: "Truck 1", customerPO: "PO-AC-001", portEntry: "Miami", week: "W46", estadoAprobacion: "APROBADA", estadoProgreso: "PENDIENTE ASIGNACIÓN", unidadPrecio: "USD / lb", orden: "SO-9001", estadoPlanificacion: "PLANIFICADA", especie: "SA", especieDescripcion: "Salmón Atlántico", estadoDetPrecio: "OK", incoterms2: "FOB", brand: "AquaChile", }, { id: "DEM-1002", salesRep: "María López", demandId: "DEM-1002", tos: "CFR", shipTo: "Santa Monica", pickUpDate: "2025-11-13", brand1: "AquaChile", material: "1113198", description: "SA TD Pr 3-4 LB#Bo Cp 35LB AQ", cases: 80, price: 5.1, flex: "No", incoterm: "CFR LAX", truck: "Truck 2", customerPO: "PO-SM-002", portEntry: "Los Angeles", week: "W46", estadoAprobacion: "EN REVISIÓN", estadoProgreso: "PENDIENTE APROBACIÓN", unidadPrecio: "USD / lb", orden: "SO-9002", estadoPlanificacion: "PENDIENTE", especie: "SA", especieDescripcion: "Salmón Atlántico", estadoDetPrecio: "PENDIENTE", incoterms2: "CFR", brand: "AquaChile", }, ];

function loadInventoryFromStorage(): InventoryRow[] {
  if (typeof window === "undefined") return sampleInventoryData;
  try {
    const raw = window.localStorage.getItem(INVENTORY_LS_KEY);
    return raw ? (JSON.parse(raw) as InventoryRow[]) : sampleInventoryData;
  } catch { return sampleInventoryData; }
}

function saveInventoryToStorage(list: InventoryRow[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(INVENTORY_LS_KEY, JSON.stringify(list));
  } catch { /* ignore */ }
}

function loadAssignmentsFromStorage(): Assignment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ASSIGNMENTS_LS_KEY);
    return raw ? (JSON.parse(raw) as Assignment[]) : [];
  } catch { return []; }
}

function saveAssignmentsToStorage(list: Assignment[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ASSIGNMENTS_LS_KEY, JSON.stringify(list));
  } catch { /* ignore */ }
}

// --- NUEVO: FUNCIONES PARA CARGAR Y GUARDAR ÓRDENES ---
function loadSalesOrdersFromStorage(): SalesOrder[] {
  if (typeof window === "undefined") return sampleSalesOrders;
  try {
    const raw = window.localStorage.getItem(SALES_ORDERS_LS_KEY);
    return raw ? (JSON.parse(raw) as SalesOrder[]) : sampleSalesOrders;
  } catch {
    return sampleSalesOrders;
  }
}

function saveSalesOrdersToStorage(list: SalesOrder[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SALES_ORDERS_LS_KEY, JSON.stringify(list));
  } catch { /* ignore */ }
}
// --- FIN DE BLOQUE NUEVO ---

function getTrackingLink(invRow: InventoryRow): string {
  if (!invRow.trackingToken) return "";
  const origin = typeof window !== "undefined" && window.location ? window.location.origin : "https://tracking.example";
  return `${origin}/track/${invRow.trackingToken}`;
}

const kpiCards = [ { id: "stock", label: "Cajas inventario (disponibles)", icon: Package }, { id: "pendingOrders", label: "Órdenes pendientes", icon: FileText }, { id: "assignments", label: "Asignaciones creadas", icon: ClipboardList }, { id: "totalLbs", label: "Lbs totales disponibles", icon: Layers }, ];
const CATEGORY_COLORS = [ "#0ea5e9", "#6366f1", "#22c55e", "#f97316", "#ec4899", "#eab308", "#14b8a6", "#facc15", ];

// =====================================================================
// COMPONENTE PRINCIPAL: App
// =====================================================================

export default function App() {
  const [tab, setTab] = useState<TabId>("dashboard");
  const [search, setSearch] = useState("");
  const [inventory, setInventory] = useState<InventoryRow[]>(loadInventoryFromStorage);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(loadSalesOrdersFromStorage); // <-- MODIFICADO
  const [assignments, setAssignments] = useState<Assignment[]>(loadAssignmentsFromStorage);
  
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [assignmentMode, setAssignmentMode] = useState<AssignmentTipo>("ORDEN");
  const [showNewPOForm, setShowNewPOForm] = useState(false);
  const [showArchivedAssignments, setShowArchivedAssignments] = useState(false);
  const [showNewSOForm, setShowNewSOForm] = useState(false); // <-- NUEVA LÍNEA

  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  if (path.startsWith("/track/")) {
    const token = path.split("/track/")[1] || "";
    const invRow = loadInventoryFromStorage().find(i => i.trackingToken === token);
    if (invRow) {
      const relatedAssignments = loadAssignmentsFromStorage().filter(a => a.items.some(it => it.inventoryId === invRow.id));
      const relatedSalesOrder = loadSalesOrdersFromStorage().find(so => so.customerPO === invRow.customerPO); // Carga dinámica
      return <ClientTrackingView inventoryRow={invRow} assignments={relatedAssignments} salesOrder={relatedSalesOrder} />;
    }
    return <div className="flex items-center justify-center h-screen bg-gray-100"><div className="p-8 bg-white shadow-lg rounded-lg"><h1>Tracking link inválido o no encontrado.</h1></div></div>;
  }

  const sendTrackingEmail = (inventoryId: string) => {
    const row = inventory.find(r => r.id === inventoryId);
    if (!row) {
      alert("Error: Inventory lot not found.");
      return;
    }
    
    let recipientEmail = clientDirectory[row.clientePrincipal]?.email;
    if (!recipientEmail) {
      const enteredEmail = prompt(`Please enter the email for ${row.clientePrincipal}:`);
      if (!enteredEmail || !enteredEmail.includes('@')) {
        alert("Invalid email provided. Sending canceled.");
        return;
      }
      recipientEmail = enteredEmail;
    }
    
    const emailSubject = `Update on your AquaChile Order: PO ${row.po}`;
    const emailBody = composeTrackingEmailHTML(row);
    
    console.log("--- SIMULATING EMAIL ---");
    console.log(`To: ${recipientEmail}`);
    console.log(`Subject: ${emailSubject}`);
    console.log("Body (HTML):", emailBody);
    alert(`Email simulation sent for PO ${row.po} to ${recipientEmail}.\nCheck the developer console (F12) to see the HTML body.`);
  };

  const filteredInventory = useMemo(() => {
    const q = search.toLowerCase();
    return inventory.filter(row => row.activo).filter(row =>
      [row.po, row.customerPO, row.material, row.descripcion, row.producto, row.clientePrincipal, row.clientes.join(" "), row.bodega].join(" ").toLowerCase().includes(q)
    );
  }, [inventory, search]);

  const kpis = useMemo(() => {
    const vivos = inventory.filter((r) => r.activo);
    const totalCajasInv = vivos.reduce((s, r) => s + r.cajasInv, 0);
    const totalLbsAvailable = vivos.reduce( (s, r) => s + r.cajasInv * r.formatoCaja, 0 );
    const totalAssignments = assignments.length;
    
    const pendingOrders = salesOrders.filter(so => so.estadoProgreso !== 'COMPLETADA').length; 

    return { totalCajasInv, totalAssignments, pendingOrders, totalLbsAvailable, };
  }, [inventory, assignments, salesOrders]);

  const dashboardAgg: DashboardAgg = useMemo(() => {
    const vivos = inventory.filter((r) => r.activo);
    const byWarehouseMap = new Map<string, { bodega: string; totalCajas: number; totalLbs: number }>();
    const byStatusMap = new Map<string, { status: string; cajas: number }>();
    const byAsgStatusMap = new Map<string, { status: string; count: number }>();

    for (const r of vivos) {
      const wh = byWarehouseMap.get(r.bodega) ?? { bodega: r.bodega, totalCajas: 0, totalLbs: 0 };
      wh.totalCajas += r.cajasInv;
      wh.totalLbs += r.cajasInv * r.formatoCaja;
      byWarehouseMap.set(r.bodega, wh);

      const st = byStatusMap.get(r.status) ?? { status: r.status, cajas: 0 };
      st.cajas += r.cajasInv;
      byStatusMap.set(r.status, st);
    }
    
    for (const a of assignments) {
      const stId = a.estado; 
      const st = byAsgStatusMap.get(stId) ?? { status: stId, count: 0 };
      st.count += 1;
      byAsgStatusMap.set(stId, st);
    }

    return {
      byWarehouse: Array.from(byWarehouseMap.values()),
      byStatus: Array.from(byStatusMap.values()),
      assignmentsByStatus: Array.from(byAsgStatusMap.values()),
    };
  }, [inventory, assignments]);

  const categorySummary = useMemo(() => {
    type Row = { key: string; sector: string; trim: string; size: string; cajas: number };
    const map = new Map<string, Row>();
    for (const r of inventory.filter((x) => x.activo)) {
      const key = `${r.sector}-${r.trim}-${r.size}`;
      const existing = map.get(key) || { key, sector: r.sector, trim: r.trim, size: r.size, cajas: 0 };
      existing.cajas += r.cajasInv;
      map.set(key, existing);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.sector.localeCompare(b.sector) || a.trim.localeCompare(b.trim) || a.size.localeCompare(b.size)
    );
  }, [inventory]);
  
  // --- NUEVO: FUNCIÓN PARA MANEJAR CREACIÓN DE ORDEN ---
  const handleCreateNewSalesOrder = (data: Omit<SalesOrder, 'id'>) => {
    const newOrder: SalesOrder = {
      ...data,
      id: `DEM-${uid()}`,
    };
    setSalesOrders(prev => {
      const nextState = [newOrder, ...prev];
      saveSalesOrdersToStorage(nextState);
      return nextState;
    });
    setShowNewSOForm(false);
  };
  // --- FIN DE BLOQUE NUEVO ---

  const handleCreateNewPO = (data: Omit<InventoryRow, 'id' | 'totalLbs' | 'cajasInv' | 'activo' | 'clientes' | 'statusHistory' | 'trackingToken' | 'fechaCierre'>) => {
    const now = new Date().toISOString();
    const newPO: InventoryRow = {
      ...data,
      id: `row-${uid()}`,
      cajasInv: data.cajasOrden,
      totalLbs: data.cajasOrden * data.formatoCaja,
      clientes: [data.clientePrincipal],
      activo: true,
      trackingToken: uid(),
      statusHistory: [{ at: now, status: data.status }],
    };
    setInventory(prev => {
      const nextState = [newPO, ...prev];
      saveInventoryToStorage(nextState);
      return nextState;
    });
    setShowNewPOForm(false);
  };
  
  const handleUpdateInventoryStatus = (rowId: string, newStatus: TrackingStatus) => {
    setInventory(prev => {
      const nextState = prev.map(row => {
        if (row.id !== rowId) return row;
        const updatedRow = { ...row, status: newStatus, statusHistory: [...row.statusHistory, { at: new Date().toISOString(), status: newStatus }] };
        console.log(`PO ${row.po} status updated to ${newStatus}.`);
        return updatedRow;
      });
      saveInventoryToStorage(nextState);
      return nextState;
    });
  };

  const handleCreateAssignment = (data: { tipo: AssignmentTipo; salesOrderId?: string; spotCliente?: string; spotRef?: string; items: OrderItem[] }) => {
    const cliente = data.tipo === "ORDEN" ? (salesOrders.find(s => s.id === data.salesOrderId)?.shipTo ?? "") : (data.spotCliente ?? "");
    if (!cliente) { alert("Cliente no encontrado para la asignación."); return; }
    
    const hasStock = data.items.every(item => { const invItem = inventory.find(i => i.id === item.inventoryId); return invItem && invItem.cajasInv >= item.cajas; });
    if (!hasStock) { alert("No hay stock suficiente para completar esta asignación."); return; }

    const newAssignment: Assignment = { id: `ASG-${String(assignments.length + 1).padStart(4, "0")}`, fecha: new Date().toISOString().slice(0, 10), ...data, cliente, estado: "ACTIVA", };

    setInventory(prevInv => {
      const nextState = prevInv.map(r => {
        const assignedItem = data.items.find(it => it.inventoryId === r.id);
        if (!assignedItem) return r;
        const newCajasInv = r.cajasInv - assignedItem.cajas;
        return { ...r, cajasInv: newCajasInv, activo: newCajasInv > 0 };
      });
      saveInventoryToStorage(nextState);
      return nextState;
    });

    setAssignments(prev => { const next = [newAssignment, ...prev]; saveAssignmentsToStorage(next); return next; });
    setShowAssignmentForm(false);
  };

  const handleToggleAssignmentState = (id: string, to: AssignmentEstado) => {
    const asg = assignments.find(a => a.id === id);
    if (!asg) return;

    if (to === 'ANULADA') {
      if (!window.confirm("¿Anular esta asignación y devolver stock? La asignación irá al historial.")) return;
      setInventory(prevInv => {
        const nextState = prevInv.map(r => {
          const returnedItem = asg.items.find(it => it.inventoryId === r.id);
          if (!returnedItem) return r;
          return { ...r, cajasInv: r.cajasInv + returnedItem.cajas, activo: true };
        });
        saveInventoryToStorage(nextState);
        return nextState;
      });
    } else {
      const hasStock = asg.items.every(item => { const invItem = inventory.find(i => i.id === item.inventoryId); return invItem && invItem.cajasInv >= item.cajas; });
      if (!hasStock) { alert("No hay stock suficiente para reactivar esta asignación."); return; }
      setInventory(prevInv => {
        const nextState = prevInv.map(r => {
          const assignedItem = asg.items.find(it => it.inventoryId === r.id);
          if (!assignedItem) return r;
          return { ...r, cajasInv: r.cajasInv - assignedItem.cajas };
        });
        saveInventoryToStorage(nextState);
        return nextState;
      });
    }
    
    setAssignments(prev => { const next = prev.map(a => a.id === id ? { ...a, estado: to } : a); saveAssignmentsToStorage(next); return next; });
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50">
        <header className="bg-slate-900 text-white sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4">
            <nav className="flex flex-wrap gap-2 text-xs sm:text-sm">
                <NavButton active={tab === "dashboard"} onClick={() => setTab("dashboard")} icon={Layers} label="Dashboard" />
                <NavButton active={tab === "inventory"} onClick={() => setTab("inventory")} icon={Warehouse} label="Inventory" />
                <NavButton active={tab === "orders"} onClick={() => setTab("orders")} icon={FileText} label="Orders" />
                <NavButton active={tab === "warehouse"} onClick={() => setTab("warehouse")} icon={Warehouse} label="Warehouses" />
                <NavButton active={tab === "assignments"} onClick={() => setTab("assignments")} icon={ClipboardList} label="Allocations" />
                <NavButton active={tab === "clientUpdate"} onClick={() => setTab("clientUpdate")} icon={Mail} label="Tracking" />
                <NavButton active={tab === "categories"} onClick={() => setTab("categories")} icon={PieChartIcon} label="Categories" />
            </nav>
            {tab === "inventory" && (
              <div className="ml-auto relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Inventory..." className="pl-8 pr-3 py-2 rounded-xl bg-white/90 text-xs text-black w-64 border border-slate-700" />
              </div>
            )}
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {tab === "dashboard" && ( <DashboardView kpis={kpis} agg={dashboardAgg} /> )}
          {tab === "inventory" && ( <InventoryView rows={filteredInventory} onNewPO={() => setShowNewPOForm(true)} /> )}
          {tab === "warehouse" && ( <WarehouseView inventory={inventory.filter(r => r.activo)} /> )}
          {tab === "assignments" && ( <AssignmentsView assignments={assignments} salesOrders={salesOrders} onToggleState={handleToggleAssignmentState} onNewAssignmentOrden={() => { setAssignmentMode("ORDEN"); setShowAssignmentForm(true); }} onNewAssignmentSpot={() => { setAssignmentMode("SPOT"); setShowAssignmentForm(true); }} showArchived={showArchivedAssignments} onToggleArchived={() => setShowArchivedAssignments(prev => !prev)} /> )}
          {tab === "clientUpdate" && ( <ClientUpdateView inventory={inventory.filter(r => r.activo)} onStatusChange={handleUpdateInventoryStatus} onSendEmail={sendTrackingEmail} /> )}
          {tab === 'orders' && <SalesOrdersView orders={salesOrders} onNewOrder={() => setShowNewSOForm(true)} />}
          {tab === "categories" && <CategoriesView summary={categorySummary} />}
        </main>
      </div>

      {showAssignmentForm && <AssignmentForm mode={assignmentMode} inventory={inventory.filter(r => r.activo && r.cajasInv > 0)} salesOrders={salesOrders} onCreate={handleCreateAssignment} onCancel={() => setShowAssignmentForm(false)} />}
      {showNewPOForm && <NewPOForm onCreate={handleCreateNewPO} onCancel={() => setShowNewPOForm(false)} />}
      {showNewSOForm && <NewSalesOrderForm onCreate={handleCreateNewSalesOrder} onCancel={() => setShowNewSOForm(false)} />}
    </>
  );
}

// =====================================================================
// COMPONENTES AUXILIARES Y DE VISTAS
// =====================================================================

function Header() {
  return ( <div className="w-full flex items-center gap-3 px-6 py-3 border-b bg-white"><img src="/aquachile_logo.png" alt="AquaChile" className="h-9 object-contain" /><div className="flex flex-col"><span className="font-semibold">Inventory & Orders Tracker</span></div></div> );
}

function Badge({ text }: { text: string }) {
  const colors: Record<string, string> = { "EN_TRANSITO": "bg-amber-100 text-amber-700", "EN BODEGA": "bg-gray-100 text-gray-700", "CONFIRMADO": "bg-blue-100 text-blue-700", "LISTO_ENTREGA": "bg-yellow-100 text-yellow-700", "ENTREGADO": "bg-green-100 text-green-700", "RETRASO": "bg-red-100 text-red-700", "INCIDENCIA": "bg-orange-100 text-orange-700", "ANULADA": "bg-gray-200 text-gray-700", "APROBADA": "bg-green-100 text-green-700", "EN REVISIÓN": "bg-amber-100 text-amber-700", "ORDEN": "bg-indigo-100 text-indigo-700", "SPOT": "bg-purple-100 text-purple-700", "ACTIVA": "bg-green-100 text-green-700" };
  return (<span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ colors[text] || "bg-gray-100 text-gray-700" }`}>{text.replace(/_/g, " ")}</span>);
}

function NavButton({ active, onClick, icon: Icon, label,}: { active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string; }) {
  return (<button onClick={onClick} className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm font-medium ${ active ? "bg-white text-slate-900" : "bg-white/5 hover:bg-white/10 text-white" }`}><Icon className="h-4 w-4" />{label}</button>);
}

function DashboardView({ kpis, agg }: { kpis: { totalCajasInv: number; totalAssignments: number; pendingOrders: number; totalLbsAvailable: number; }; agg: DashboardAgg; }) {
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(({ id, label, icon: Icon }) => {
          const value = id === "stock" ? kpis.totalCajasInv : id === "pendingOrders" ? kpis.pendingOrders : id === "assignments" ? kpis.totalAssignments : kpis.totalLbsAvailable;
          return ( <motion.div key={id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-4 shadow-sm border flex items-center gap-3"><div className="p-2 rounded-xl bg-gray-50 border"><Icon className="h-5 w-5" /></div><div><div className="text-xs text-gray-500">{label}</div><div className="text-xl font-semibold">{id === 'totalLbs' ? value.toLocaleString() : value}</div></div></motion.div> );
        })}
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border"><h3 className="text-xs font-semibold text-gray-600 mb-2">Inventario por Bodega (Cajas)</h3><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={agg.byWarehouse}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="bodega" /><YAxis /><Tooltip /><Legend /><Bar dataKey="totalCajas" name="Cajas" fill="#0ea5e9" /></BarChart></ResponsiveContainer></div></div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border"><h3 className="text-xs font-semibold text-gray-600 mb-2">Inventario por Status</h3><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={agg.byStatus}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="status" /><YAxis /><Tooltip /><Legend /><Bar dataKey="cajas" name="Cajas" fill="#8b5cf6" /></BarChart></ResponsiveContainer></div></div>
      </div>
       <div className="bg-white rounded-2xl p-4 shadow-sm border"><h3 className="text-xs font-semibold text-gray-600 mb-2">Asignaciones (Activas/Anuladas)</h3><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={agg.assignmentsByStatus}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="status" /><YAxis /><Tooltip /><Legend /><Bar dataKey="count" name="Cantidad" fill="#22c55e" /></BarChart></ResponsiveContainer></div></div>
    </div>
  );
}

function InventoryView({ rows, onNewPO }: { rows: InventoryRow[]; onNewPO: () => void; }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div><h2 className="font-semibold text-sm">Inventory</h2><p className="text-xs text-gray-500">Listado de POs disponibles en inventario.</p></div>
        <button onClick={onNewPO} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-600 text-white text-xs font-medium"><Plus className="h-3.5 w-3.5" />Agregar PO Manual</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse min-w-[1200px]">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-2 px-2">PO</th><th className="px-2">Customer PO</th><th className="px-2">Material</th><th className="px-2">Cliente P.</th><th className="px-2 text-right">Cajas Disp.</th><th className="px-2">Status Tracking</th><th className="px-2">ETA</th><th className="px-2">Bodega</th><th className="px-2">Ubicación</th><th className="px-2">Planta</th><th className="px-2">Prod</th><th className="px-2">AWB</th><th className="px-2">Sector</th><th className="px-2">Trim</th><th className="px-2">Calibre</th><th className="px-2">Escamas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-2 px-2 font-mono">{r.po}</td><td className="px-2 font-mono">{r.customerPO}</td><td className="px-2 font-mono">{r.material}</td><td className="px-2">{r.clientePrincipal}</td><td className="px-2 text-right font-semibold">{r.cajasInv.toLocaleString()}</td><td className="px-2"><Badge text={r.status} /></td><td className="px-2">{r.eta}</td><td className="px-2">{r.bodega}</td><td className="px-2">{r.ubicacion}</td><td className="px-2">{r.planta}</td><td className="px-2">{r.produccion}</td><td className="px-2 font-mono">{r.awb ?? '--'}</td><td className="px-2">{r.sector}</td><td className="px-2">{r.trim}</td><td className="px-2">{r.size}</td><td className="px-2">{r.escamas}</td>
              </tr>
            ))}
            {rows.length === 0 && ( <tr><td colSpan={16} className="text-center py-6 text-gray-400">No hay inventario que coincida con la búsqueda.</td></tr> )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WarehouseView({ inventory }: { inventory: InventoryRow[] }) {
  type WHRow = { bodega: string; ubicacion: string; totalCajas: number; totalLbs: number; productos: { key: string; producto: string; material: string; cajas: number; }[]; };
  const data: WHRow[] = useMemo(() => {
    const map = new Map<string, WHRow>();
    for (const r of inventory) {
      const key = r.bodega;
      const wh = map.get(key) ?? { bodega: r.bodega, ubicacion: r.ubicacion, totalCajas: 0, totalLbs: 0, productos: [], };
      wh.totalCajas += r.cajasInv;
      wh.totalLbs += r.cajasInv * r.formatoCaja;
      const prodKey = `${r.material}-${r.producto}`;
      const existingProd = wh.productos.find((p) => p.key === prodKey) ?? { key: prodKey, producto: r.producto, material: r.material, cajas: 0, };
      existingProd.cajas += r.cajasInv;
      if (!wh.productos.some((p) => p.key === prodKey)) wh.productos.push(existingProd);
      map.set(key, wh);
    }
    return Array.from(map.values());
  }, [inventory]);

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border">
      <h2 className="font-semibold text-sm mb-3">Bodegas</h2>
      <p className="text-xs text-gray-500 mb-3">Resumen de inventario por bodega y producto.</p>
      {data.length === 0 && ( <div className="text-center text-gray-400 text-xs py-6">No hay inventario cargado.</div> )}
      <div className="space-y-4">
        {data.map((wh) => (
          <div key={wh.bodega} className="border rounded-2xl p-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2"><div><div className="text-sm font-semibold">{wh.bodega}</div><div className="text-[11px] text-gray-500">{wh.ubicacion}</div></div><div className="text-right text-xs text-gray-600"><div>Cajas: <strong>{wh.totalCajas.toLocaleString()}</strong></div><div>Lbs: <strong>{wh.totalLbs.toLocaleString()}</strong></div></div></div>
            <div className="overflow-x-auto"><table className="w-full text-[11px] border-collapse min-w-[400px] bg-white rounded-xl"><thead><tr className="text-left text-gray-500 border-b"><th className="py-1.5 px-2">Material</th><th className="px-2">Producto</th><th className="px-2 text-right">Cajas</th></tr></thead><tbody>{wh.productos.map((p) => (<tr key={p.key} className="border-b last:border-0"><td className="py-1.5 px-2 font-mono whitespace-nowrap">{p.material}</td><td className="px-2 whitespace-nowrap">{p.producto}</td><td className="px-2 text-right">{p.cajas.toLocaleString()}</td></tr>))}</tbody></table></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoriesView({ summary }: { summary: { key: string; sector: string; trim: string; size: string; cajas: number; }[]; }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border">
      <h2 className="font-semibold text-sm mb-3">Categorías (Sector / Trim / Size)</h2>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[500px]">
            <thead><tr className="text-left text-gray-500 border-b"><th className="py-2 px-2">Sector</th><th className="px-2">Trim</th><th className="px-2">Size</th><th className="px-2 text-right">Cajas en inventario</th></tr></thead>
            <tbody>{summary.map((r) => (<tr key={r.key} className="border-b last:border-0"><td className="py-2 px-2 whitespace-nowrap">{r.sector}</td><td className="px-2 whitespace-nowrap">{r.trim}</td><td className="px-2 whitespace-nowrap">{r.size}</td><td className="px-2 text-right font-semibold">{r.cajas.toLocaleString()}</td></tr>))}</tbody>
          </table>
        </div>
        <div className="bg-gray-50 rounded-2xl border p-4 flex flex-col">
          <h3 className="text-xs font-medium text-gray-600 mb-2">Distribución por categoría (cajas disponibles)</h3>
          <div className="flex-1 min-h-[220px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={summary} dataKey="cajas" nameKey="key" outerRadius={80} innerRadius={40} paddingAngle={2}>{summary.map((entry, index) => (<Cell key={entry.key} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />))}</Pie><Tooltip formatter={(value: any) => `${(value as number).toLocaleString()} cj`} labelFormatter={(label) => `Cat: ${label}`} /></PieChart></ResponsiveContainer></div>
        </div>
      </div>
    </div>
  );
}

function AssignmentsView({ assignments, salesOrders, onToggleState, onNewAssignmentOrden, onNewAssignmentSpot, showArchived, onToggleArchived, }: { assignments: Assignment[]; salesOrders: SalesOrder[]; onToggleState: (id: string, to: AssignmentEstado) => void; onNewAssignmentOrden: () => void; onNewAssignmentSpot: () => void; showArchived: boolean; onToggleArchived: () => void; }) {
  const filteredAssignments = assignments.filter(a => showArchived ? a.estado === 'ANULADA' : a.estado === 'ACTIVA');
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div><h2 className="font-semibold text-sm">Allocations</h2><p className="text-xs text-gray-500">{showArchived ? "Historial de asignaciones anuladas" : "Asignaciones activas"}</p></div>
        <div className="flex gap-2">
          <button onClick={onToggleArchived} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-slate-800 text-xs font-medium"><Archive className="h-3.5 w-3.5" />{showArchived ? "Ver Activas" : "Ver Historial"}</button>
          <button onClick={onNewAssignmentSpot} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-slate-800 text-xs font-medium"><Plus className="h-3.5 w-3.5" />Venta spot</button>
          <button onClick={onNewAssignmentOrden} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-600 text-white text-xs font-medium"><Plus className="h-3.5 w-3.5" />Nueva asignación</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse min-w-[1000px]">
          <thead><tr className="text-left text-gray-500 border-b"><th className="py-2 px-2">Asignación</th><th className="px-2">Fecha</th><th className="px-2">Tipo</th><th className="px-2">Cliente</th><th className="px-2">Ref. Orden</th><th className="px-2 text-right">Cajas Totales</th><th className="px-2 text-right">Acción</th></tr></thead>
          <tbody>
            {filteredAssignments.map(asg => {
              const cajas = asg.items.reduce((s, it) => s + it.cajas, 0);
              const ref = asg.tipo === 'ORDEN' ? (salesOrders.find(s => s.id === asg.salesOrderId)?.demandId ?? asg.salesOrderId) : asg.spotRef;
              return (
                <tr key={asg.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 px-2 font-mono">{asg.id}</td><td className="px-2">{asg.fecha}</td><td className="px-2"><Badge text={asg.tipo} /></td><td className="px-2">{asg.cliente}</td><td className="px-2">{ref}</td><td className="px-2 text-right font-semibold">{cajas}</td>
                  <td className="px-2 text-right">
                    {showArchived ? (<button onClick={() => onToggleState(asg.id, 'ACTIVA')} className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium"><Undo className="h-3 w-3" /> Reactivar</button>) : (<button onClick={() => onToggleState(asg.id, 'ANULADA')} className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium"><X className="h-3 w-3" /> Anular</button>)}
                  </td>
                </tr>
              );
            })}
            {filteredAssignments.length === 0 && ( <tr><td colSpan={7} className="text-center py-6 text-gray-400">No hay asignaciones en esta vista.</td></tr> )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function ClientUpdateView({ inventory, onStatusChange, onSendEmail }: { inventory: InventoryRow[]; onStatusChange: (rowId: string, newStatus: TrackingStatus) => void; onSendEmail: (rowId: string) => void; }) {
  const statusOptions: TrackingStatus[] = [ "CONFIRMADO", "EN_TRANSITO", "LISTO_ENTREGA", "ENTREGADO", "RETRASO", "INCIDENCIA", ];
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border">
      <h2 className="font-semibold text-sm mb-2">Tracking de Inventario</h2>
      <p className="text-xs text-gray-500 mb-3">Este es el centro de control para el ciclo de vida de un PO. Actualiza el estado aquí para notificar a los clientes.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse min-w-[900px]">
          <thead><tr className="text-left text-gray-500 border-b"><th className="py-2 px-2">PO</th><th className="px-2">Cliente P.</th><th className="px-2">Link Tracking</th><th className="px-2">Status Actual</th><th className="px-2 text-right">Actualizar Status</th>
<thead>
  <tr className="text-left text-gray-500 border-b">
    <th className="py-2 px-2">PO</th>
    <th className="px-2">Cliente P.</th>
    <th className="px-2">Link Tracking</th>
    <th className="px-2">Status Actual</th>
    <th className="px-2 text-right">Actualizar Status</th>
    <th className="px-2 text-center">Notificar</th>
  </tr>
</thead></tr></thead>
<tbody>
  {inventory.map(r => (
    <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
      <td className="py-2 px-2 font-mono">{r.po}</td>
      <td className="px-2">{r.clientePrincipal}</td>
      <td className="px-2">
        <a href={getTrackingLink(r)} target="_blank" rel="noreferrer" className="text-sky-700 text-[11px] hover:underline" onClick={e => e.stopPropagation()}>
          Ver Link
        </a>
      </td>
      <td className="px-2"><Badge text={r.status} /></td>
      <td className="px-2 text-right">
        <select value={r.status} onChange={e => onStatusChange(r.id, e.target.value as TrackingStatus)} className="border rounded-md px-2 py-1 text-[11px] bg-white hover:border-sky-500">
          {statusOptions.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
      </td>
      <td className="px-2 text-center">
        <button 
          onClick={() => onSendEmail(r.id)} 
          title="Send Tracking Email" 
          className="p-1.5 rounded-full hover:bg-sky-100 text-sky-600 transition-colors"
        >
          <Mail className="h-4 w-4" />
        </button>
      </td>
    </tr>
  ))}
  {inventory.length === 0 && ( 
    <tr>
      <td colSpan={6} className="text-center py-6 text-gray-400">
        No hay inventario activo para mostrar.
      </td>
    </tr> 
  )}
</tbody>
        </table>
      </div>
    </div>
  );
}

// --- MODIFICADO: SalesOrdersView ahora tiene un botón para crear órdenes ---
function SalesOrdersView({ orders, onNewOrder }: { orders: SalesOrder[], onNewOrder: () => void }) { 
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h2 className="font-semibold text-sm">Órdenes de Venta</h2>
        <button onClick={onNewOrder} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-600 text-white text-xs font-medium">
          <Plus className="h-3.5 w-3.5" />
          Crear Orden Manual
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse min-w-[2500px]">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="p-2">Sales Rep</th><th className="p-2">Demand ID</th><th className="p-2">ToS</th><th className="p-2">ShipTo</th><th className="p-2">Pick up Date</th><th className="p-2">Brand1</th><th className="p-2">Material</th><th className="p-2">Description</th><th className="p-2 text-right">Cases</th><th className="p-2 text-right">Price</th><th className="p-2">Flex</th><th className="p-2">Incoterm</th><th className="p-2">Truck</th><th className="p-2">Customer PO</th><th className="p-2">Port Entry</th><th className="p-2">Week</th><th className="p-2">Estado Aprobación</th><th className="p-2">Estado Progreso</th><th className="p-2">Unidad Precio</th><th className="p-2">Orden</th><th className="p-2">Estado Planificación</th><th className="p-2">Especie</th><th className="p-2">Desc. Especie</th><th className="p-2">Estado Det. Precio</th><th className="p-2">Incoterms</th><th className="p-2">Brand</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-2">{o.salesRep}</td><td className="p-2">{o.demandId}</td><td className="p-2">{o.tos}</td><td className="p-2">{o.shipTo}</td><td className="p-2">{o.pickUpDate}</td><td className="p-2">{o.brand1}</td><td className="p-2 font-mono">{o.material}</td><td className="p-2">{o.description}</td><td className="p-2 text-right">{o.cases}</td><td className="p-2 text-right">{o.price}</td><td className="p-2">{o.flex}</td><td className="p-2">{o.incoterm}</td><td className="p-2">{o.truck}</td><td className="p-2">{o.customerPO}</td><td className="p-2">{o.portEntry}</td><td className="p-2">{o.week}</td><td className="p-2"><Badge text={o.estadoAprobacion} /></td><td className="p-2">{o.estadoProgreso}</td><td className="p-2">{o.unidadPrecio}</td><td className="p-2">{o.orden}</td><td className="p-2">{o.estadoPlanificacion}</td><td className="p-2">{o.especie}</td><td className="p-2">{o.especieDescripcion}</td><td className="p-2">{o.estadoDetPrecio}</td><td className="p-2">{o.incoterms2}</td><td className="p-2">{o.brand}</td>
              </tr>
            ))}
             {orders.length === 0 && ( <tr><td colSpan={26} className="text-center py-6 text-gray-400">No hay órdenes de venta para mostrar.</td></tr> )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewPOForm({ onCreate, onCancel }: { onCreate: (data: Omit<InventoryRow, 'id' | 'totalLbs' | 'cajasInv' | 'activo' | 'clientes' | 'statusHistory' | 'trackingToken' | 'fechaCierre'>) => void; onCancel: () => void; }) {
  const warehouses = [ { name: "SUC", location: "Miami, FL" }, { name: "EVO LAX", location: "Los Angeles, CA" }, { name: "EVO DFW", location: "Dallas, TX" }, { name: "CARTYS", location: "New York, NY" }, { name: "CARTYS-RFD", location: "Rockford, IL" }, { name: "SFO-CENTRA FREIGHT", location: "San Francisco, CA" }, { name: "ARAHO", location: "Boston, MA" }, { name: "PRIME", location: "Los Angeles, CA" }, { name: "RFD-Direct", location: "Rockford, IL" }, ];
  const productTypes = ["Filetes", "Hon"];
  const productDescriptions = [ "HON 14-16 55", "R TD 2-3 10", "R TD 2-3 35", "R TD 3-4 10", "R TD 2-4 35", "R TD 3-4 SE 35", "R TD 4-5 35", "R TE 2-3 35", "R TE 3-4 35", "R TF 2-5 35", "SG TD 3-4 35", "SG TD Pr 3-4 35", "SG TD Pr 4-5 35", "TD 2-3 10", "TD 2-3 35", "TD 2-3 SE 10", "TD 2-3 SE 35", "TD 3-4 10", "TD 3-4 35", "TD 3-4 SE 10", "TD 3-4 SE 35", "TE 2-3 35", "TE 3-4 35", "TF 2-5 35" ];

  const [formData, setFormData] = useState({
    po: "",
    customerPO: "",
    material: "",
    descripcion: productDescriptions[0],
    producto: "",
    clientePrincipal: "",
    ubicacion: warehouses[0].location,
    bodega: warehouses[0].name,
    planta: "Magallanes",
    produccion: new Date().toISOString().slice(0, 10),
    eta: new Date().toISOString().slice(0, 10),
    status: "CONFIRMADO" as TrackingStatus,
    cajasOrden: 100,
    formatoCaja: 35,
    sector: "SA",
    trim: "TD",
    size: "4-5",
    escamas: "",
    awb: "",
    time: "AM",
    empacado: productTypes[0],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleWarehouseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = warehouses.find(w => w.name === e.target.value);
    if (selected) {
      setFormData(prev => ({ ...prev, bodega: selected.name, ubicacion: selected.location }));
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.po || !formData.material || !formData.clientePrincipal) {
      alert("Por favor, completa los campos obligatorios: PO, Material y Cliente Principal.");
      return;
    }
    onCreate({ ...formData, cajasOrden: Number(formData.cajasOrden), formatoCaja: Number(formData.formatoCaja), awb: formData.awb || null, escamas: formData.escamas || null });
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between pb-2 border-b">
          <h2 className="text-lg font-semibold">Agregar Nuevo Lote al Inventario</h2>
          <button type="button" onClick={onCancel} className="rounded-full p-1.5 hover:bg-gray-100"><X className="h-4 w-4" /></button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-xs">
          <div className="space-y-3">
            <div><label className="block font-medium text-gray-600 mb-1">PO (*)</label><input name="po" value={formData.po} onChange={handleChange} className="w-full rounded-lg border px-3 py-1.5" /></div>
             <div><label className="block font-medium text-gray-600 mb-1">Customer PO</label><input name="customerPO" value={formData.customerPO} onChange={handleChange} className="w-full rounded-lg border px-3 py-1.5" /></div>
            <div><label className="block font-medium text-gray-600 mb-1">Material (*)</label><input name="material" value={formData.material} onChange={handleChange} className="w-full rounded-lg border px-3 py-1.5" /></div>
            <div><label className="block font-medium text-gray-600 mb-1">Cliente Principal (*)</label><input name="clientePrincipal" value={formData.clientePrincipal} onChange={handleChange} className="w-full rounded-lg border px-3 py-1.5" /></div>
            <div>
              <label className="block font-medium text-gray-600 mb-1">Descripción</label>
              <select name="descripcion" value={formData.descripcion} onChange={handleChange} className="w-full rounded-lg border px-3 py-1.5 bg-white">
                {productDescriptions.map(desc => (<option key={desc} value={desc}>{desc}</option>))}
              </select>
            </div>
            <div><label className="block font-medium text-gray-600 mb-1">Producto</label><input name="producto" value={formData.producto} onChange={handleChange} className="w-full rounded-lg border px-3 py-1.5" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block font-medium text-gray-600 mb-1">Cajas Orden (*)</label><input type="number" name="cajasOrden" value={formData.cajasOrden} onChange={handleChange} className="w-full rounded-lg border px-3 py-1.5" /></div>
              <div><label className="block font-medium text-gray-600 mb-1">Formato Caja (Lb)</label><input type="number" name="formatoCaja" value={formData.formatoCaja} onChange={handleChange} className="w-full rounded-lg border px-3 py-1.5" /></div>
            </div>
            <div><label className="block font-medium text-gray-600 mb-1">AWB / BL</label><input name="awb" value={formData.awb} onChange={handleChange} className="w-full rounded-lg border px-3 py-1.5" /></div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block font-medium text-gray-600 mb-1">Bodega / Ubicación</label>
              <select onChange={handleWarehouseChange} value={formData.bodega} className="w-full rounded-lg border px-3 py-1.5 bg-white">
                {warehouses.map(wh => (<option key={wh.name} value={wh.name}>{wh.name} / {wh.location}</option>))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block font-medium text-gray-600 mb-1">Fecha Producción</label><input type="date" name="produccion" value={formData.produccion} onChange={handleChange} className="w-full rounded-lg border px-3 py-1.5" /></div>
              <div><label className="block font-medium text-gray-600 mb-1">ETA</label><input type="date" name="eta" value={formData.eta} onChange={handleChange} className="w-full rounded-lg border px-3 py-1.5" /></div>
            </div>
            <div>
              <label className="block font-medium text-gray-600 mb-1">Tipo de Empacado</label>
              <select name="empacado" value={formData.empacado} onChange={handleChange} className="w-full rounded-lg border px-3 py-1.5 bg-white">
                {productTypes.map(type => (<option key={type} value={type}>{type}</option>))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-4">
                <div><label className="block font-medium text-gray-600 mb-1">Sector</label><input name="sector" value={formData.sector} onChange={handleChange} className="w-full rounded-lg border px-3 py-1.5" /></div>
                <div><label className="block font-medium text-gray-600 mb-1">Trim</label><input name="trim" value={formData.trim} onChange={handleChange} className="w-full rounded-lg border px-3 py-1.5" /></div>
                <div><label className="block font-medium text-gray-600 mb-1">Calibre (Size)</label><input name="size" value={formData.size} onChange={handleChange} className="w-full rounded-lg border px-3 py-1.5" /></div>
            </div>
             <div><label className="block font-medium text-gray-600 mb-1">Escamas (Opcional)</label><input name="escamas" value={formData.escamas} onChange={handleChange} className="w-full rounded-lg border px-3 py-1.5" /></div>
            <div><label className="block font-medium text-gray-600 mb-1">Status Inicial</label><select name="status" value={formData.status} onChange={handleChange} className="w-full rounded-lg border px-3 py-1.5 bg-white"><option value="CONFIRMADO">Confirmado</option><option value="EN_TRANSITO">En Tránsito</option></select></div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t mt-6">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl border text-sm font-medium">Cancelar</button>
          <button type="submit" className="px-5 py-2 rounded-xl bg-sky-600 text-white text-sm font-medium">Guardar Lote</button>
        </div>
      </form>
    </div>
  );
}

// --- NUEVO: FORMULARIO PARA CREAR ÓRDENES DE VENTA ---
function NewSalesOrderForm({ onCreate, onCancel }: { onCreate: (data: Omit<SalesOrder, 'id'>) => void; onCancel: () => void; }) {
  const [formData, setFormData] = useState<Omit<SalesOrder, 'id'>>({
    salesRep: "Juan Pérez",
    demandId: `DEM-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`,
    tos: "FOB",
    shipTo: "",
    pickUpDate: new Date().toISOString().slice(0, 10),
    brand1: "AquaChile",
    material: "",
    description: "",
    cases: 0,
    price: 0,
    flex: "No",
    incoterm: "FOB MIA",
    truck: "",
    customerPO: "",
    portEntry: "Miami",
    week: `W${Math.ceil((new Date().getDate() + new Date().getDay() + 1) / 7)}`,
    estadoAprobacion: "EN REVISIÓN",
    estadoProgreso: "PENDIENTE APROBACIÓN",
    unidadPrecio: "USD / lb",
    orden: `SO-${Math.floor(Math.random() * 9000) + 1000}`,
    estadoPlanificacion: "PENDIENTE",
    especie: "SA",
    especieDescripcion: "Salmón Atlántico",
    estadoDetPrecio: "PENDIENTE",
    incoterms2: "FOB",
    brand: "AquaChile",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.demandId || !formData.shipTo || !formData.customerPO) {
      alert("Por favor, completa los campos obligatorios: Demand ID, Ship To, y Customer PO.");
      return;
    }
    onCreate({
      ...formData,
      cases: Number(formData.cases) || 0,
      price: Number(formData.price) || 0,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between pb-2 border-b">
          <h2 className="text-lg font-semibold">Crear Nueva Orden de Venta</h2>
          <button type="button" onClick={onCancel} className="rounded-full p-1.5 hover:bg-gray-100"><X className="h-4 w-4" /></button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 text-xs">
            <div className="space-y-3">
              <div><label className="block font-medium text-gray-600 mb-1">Demand ID (*)</label><input name="demandId" value={formData.demandId} onChange={handleChange} className="w-full rounded-lg border px-3 py-1.5" /></div>
              <div><label className="block font-medium text-gray-600 mb-1">Ship To (*)</label><input name="shipTo" value={formData.shipTo} onChange={handleChange} className="w-full rounded-lg border px-3 py-1.5" /></div>
              <div><label className="block font-medium text-gray-600 mb-1">Customer PO (*)</label><input name="customerPO" value={formData.customerPO} onChange={handleChange} className="w-full rounded-lg border px-3 py-1.5" /></div>
              <div><label className="block font-medium text-gray-600 mb-1">Material</label><input name="material" value={formData.material} onChange={handleChange} className="w-full rounded-lg border px-3 py-1.5" /></div>
              <div><label className="block font-medium text-gray-600 mb-1">Description</label><input name="description" value={formData.description} onChange={handleChange} className="w-full rounded-lg border px-3 py-1.5" /></div>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                 <div><label className="block font-medium text-gray-600 mb-1">Cases</label><input type="number" name="cases" value={formData.cases} onChange={handleChange} className="w-full rounded-lg border px-3 py-1.5" /></div>
                 <div><label className="block font-medium text-gray-600 mb-1">Price</label><input type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} className="w-full rounded-lg border px-3 py-1.5" /></div>
              </div>
              <div><label className="block font-medium text-gray-600 mb-1">Pick up Date</label><input type="date" name="pickUpDate" value={formData.pickUpDate} onChange={handleChange} className="w-full rounded-lg border px-3 py-1.5" /></div>
              <div><label className="block font-medium text-gray-600 mb-1">Sales Rep</label><input name="salesRep" value={formData.salesRep} onChange={handleChange} className="w-full rounded-lg border px-3 py-1.5" /></div>
              <div><label className="block font-medium text-gray-600 mb-1">Estado Aprobación</label>
                <select name="estadoAprobacion" value={formData.estadoAprobacion} onChange={handleChange} className="w-full rounded-lg border px-3 py-1.5 bg-white">
                  <option>EN REVISIÓN</option>
                  <option>APROBADA</option>
                  <option>RECHAZADA</option>
                </select>
              </div>
               <div><label className="block font-medium text-gray-600 mb-1">Estado Progreso</label>
                <select name="estadoProgreso" value={formData.estadoProgreso} onChange={handleChange} className="w-full rounded-lg border px-3 py-1.5 bg-white">
                  <option>PENDIENTE APROBACIÓN</option>
                  <option>PENDIENTE ASIGNACIÓN</option>
                  <option>ASIGNADA</option>
                  <option>COMPLETADA</option>
                </select>
              </div>
            </div>
            <div className="space-y-3">
              <div><label className="block font-medium text-gray-600 mb-1">Incoterm</label><input name="incoterm" value={formData.incoterm} onChange={handleChange} className="w-full rounded-lg border px-3 py-1.5" /></div>
              <div><label className="block font-medium text-gray-600 mb-1">Port of Entry</label><input name="portEntry" value={formData.portEntry} onChange={handleChange} className="w-full rounded-lg border px-3 py-1.5" /></div>
              <div><label className="block font-medium text-gray-600 mb-1">Truck</label><input name="truck" value={formData.truck} onChange={handleChange} className="w-full rounded-lg border px-3 py-1.5" /></div>
              <div><label className="block font-medium text-gray-600 mb-1">Brand</label><input name="brand" value={formData.brand} onChange={handleChange} className="w-full rounded-lg border px-3 py-1.5" /></div>
              <div><label className="block font-medium text-gray-600 mb-1">Sales Order #</label><input name="orden" value={formData.orden} onChange={handleChange} className="w-full rounded-lg border px-3 py-1.5" /></div>
            </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t mt-6">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl border text-sm font-medium">Cancelar</button>
          <button type="submit" className="px-5 py-2 rounded-xl bg-sky-600 text-white text-sm font-medium">Guardar Orden</button>
        </div>
      </form>
    </div>
  );
}
// --- FIN DE BLOQUE NUEVO ---

function AssignmentForm({ mode, inventory, salesOrders, onCreate, onCancel }: { mode: AssignmentTipo; inventory: InventoryRow[]; salesOrders: SalesOrder[]; onCreate: (data: { tipo: AssignmentTipo; salesOrderId?: string; spotCliente?: string; spotRef?: string; items: OrderItem[]; }) => void; onCancel: () => void; }) {
  const [salesOrderId, setSalesOrderId] = useState(salesOrders[0]?.id ?? "");
  const [spotCliente, setSpotCliente] = useState("");
  const [spotRef, setSpotRef] = useState("");
  const [items, setItems] = useState<OrderItem[]>([{ inventoryId: inventory[0]?.id ?? "", po: inventory[0]?.po ?? "", material: inventory[0]?.material ?? "", producto: inventory[0]?.producto ?? "", cajas: 0, }]);
  const handleAddLine = () => { if (inventory[0]) setItems(prev => [...prev, { inventoryId: inventory[0].id, po: inventory[0].po, material: inventory[0].material, producto: inventory[0].producto, cajas: 0 }]); };
  const handleRemoveLine = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const handleChangeInventory = (idx: number, id: string) => { const row = inventory.find(r => r.id === id); if (row) setItems(prev => prev.map((it, i) => i === idx ? { ...it, inventoryId: row.id, po: row.po, material: row.material, producto: row.producto } : it)); };
  const handleChangeCajas = (idx: number, value: number) => { const max = inventory.find(r => r.id === items[idx].inventoryId)?.cajasInv ?? 0; setItems(prev => prev.map((it, i) => i === idx ? { ...it, cajas: clamp(value, 0, max) } : it)); };
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); const cleanItems = items.filter(i => i.cajas > 0); if (cleanItems.length === 0) return; if (mode === 'ORDEN') { if (!salesOrderId) return; onCreate({ tipo: 'ORDEN', salesOrderId, items: cleanItems }); } else { if (!spotCliente.trim()) { alert("Ingresa el cliente."); return; } onCreate({ tipo: 'SPOT', spotCliente: spotCliente.trim(), spotRef: spotRef.trim() || undefined, items: cleanItems }); } };
  const totalCajas = items.reduce((s, i) => s + i.cajas, 0);
  const totalLbs = items.reduce((s, i) => s + (i.cajas * (inventory.find(r => r.id === i.inventoryId)?.formatoCaja ?? 0)), 0);
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">{mode === 'ORDEN' ? 'Nueva Asignación de Inventario' : 'Nueva Venta Spot'}</h2><button type="button" onClick={onCancel} className="rounded-full p-1.5 hover:bg-gray-100"><X className="h-4 w-4" /></button></div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'ORDEN' ? (<div className="space-y-1"><label className="text-xs font-medium">Orden de Venta</label><select value={salesOrderId} onChange={e => setSalesOrderId(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-xs bg-white">{salesOrders.map(s => <option key={s.id} value={s.id}>{s.demandId} • {s.shipTo} • {s.cases} cs</option>)}</select></div>) : (
            <div className="grid sm:grid-cols-2 gap-2">
              <div className="space-y-1"><label className="text-xs font-medium">Cliente Spot</label><input value={spotCliente} onChange={e => setSpotCliente(e.target.value)} className="w-full rounded-lg border px-3 py-1.5 text-xs" /></div>
              <div className="space-y-1"><label className="text-xs font-medium">Referencia Spot</label><input value={spotRef} onChange={e => setSpotRef(e.target.value)} className="w-full rounded-lg border px-3 py-1.5 text-xs" /></div>
            </div>
          )}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between items-center"><span className="text-xs font-medium">Líneas de Inventario</span><button type="button" onClick={handleAddLine} className="text-xs text-sky-700 font-medium">Agregar Línea</button></div>
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-[3fr_1fr_auto] gap-2 items-center p-2 bg-gray-50 rounded-lg">
                <select value={item.inventoryId} onChange={e => handleChangeInventory(idx, e.target.value)} className="rounded-lg border px-2 py-1.5 text-xs bg-white">{inventory.map(r => <option key={r.id} value={r.id}>{r.po} • {r.producto} ({r.cajasInv} cs disp.)</option>)}</select>
                <input type="number" placeholder="Cajas" value={item.cajas > 0 ? item.cajas : ""} onChange={e => handleChangeCajas(idx, Number(e.target.value) || 0)} className="rounded-lg border px-2 py-1.5 text-xs" />
                <button type="button" onClick={() => handleRemoveLine(idx)} disabled={items.length === 1} className="text-xs text-red-500 disabled:opacity-50 font-medium">Quitar</button>
              </div>
            ))}
          </div>
          <div className="text-xs font-medium pt-2">Total a Asignar: <strong>{totalCajas}</strong> cajas / <strong>{totalLbs.toLocaleString()}</strong> lbs</div>
          <div className="flex justify-end gap-2 pt-4"><button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-xl border text-sm">Cancelar</button><button type="submit" className="px-4 py-1.5 rounded-xl bg-sky-600 text-white text-sm font-medium">Crear Asignación</button></div>
        </form>
      </div>
    </div>
  );
}

function ClientTrackingView({ inventoryRow, assignments, salesOrder }: { inventoryRow: InventoryRow, assignments: Assignment[], salesOrder?: SalesOrder }) {
  const TRACK_STEPS: { id: TrackingStatus; label: string }[] = [ { id: "CONFIRMADO", label: "Confirmed" }, { id: "EN_TRANSITO", label: "In Transit" }, { id: "LISTO_ENTREGA", label: "Ready for Delivery" }, { id: "ENTREGADO", label: "Delivered" }];
  const currentStatusIdx = Math.max(0, TRACK_STEPS.findIndex(step => step.id === inventoryRow.status));
  const assignedItemsInThisLot = assignments.flatMap(a => a.items.filter(item => item.inventoryId === inventoryRow.id));
  const formatDateTime = (iso?: string) => iso ? new Date(iso).toLocaleString('en-US') : '-';

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 flex items-center justify-center">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between flex-wrap">
          <div className="flex items-center gap-4">
            <img src="/aquachile_logo.png" alt="AquaChile" className="h-8 object-contain" />
            <div><div className="text-xs uppercase tracking-wide text-slate-300">Order Tracking</div><h1 className="text-lg font-semibold">{inventoryRow.clientePrincipal}</h1></div>
          </div>
          <div className="text-right mt-2 sm:mt-0"><span className="text-xs text-slate-300">Current Status</span><div className="mt-1"><Badge text={inventoryRow.status} /></div></div>
        </div>
        <div className="p-6">
          <div className="relative mb-8 pt-8">
            <div className="absolute top-4 left-0 w-full h-0.5 bg-gray-200"></div>
            <div className="absolute top-4 left-0 h-0.5 bg-sky-500 transition-all duration-500" style={{ width: `${(currentStatusIdx / (TRACK_STEPS.length - 1)) * 100}%` }}></div>
            <div className="flex justify-between items-start">
              {TRACK_STEPS.map((step, idx) => (
                <div key={step.id} className="relative z-10 flex flex-col items-center w-1/4">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 ${idx <= currentStatusIdx ? 'bg-sky-500 border-sky-600 text-white' : 'bg-white border-gray-300 text-gray-400'}`}>{idx <= currentStatusIdx ? '✓' : idx + 1}</div>
                  <span className="text-[10px] mt-2 text-center font-medium text-gray-600">{step.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs border-t pt-4">
            <div><div className="text-slate-500">PO</div><div className="font-semibold text-slate-900 font-mono">{inventoryRow.customerPO}</div></div>
            <div><div className="text-slate-500">Aquachile Lot</div><div className="font-semibold text-slate-900 font-mono">{inventoryRow.po}</div></div>
            <div><div className="text-slate-500">Request ETA</div><div className="font-semibold text-slate-900">{salesOrder?.pickUpDate || '-'}</div></div>
            <div><div className="text-slate-500">Location</div><div className="font-semibold text-slate-900">{inventoryRow.ubicacion}</div></div>
            <div><div className="text-slate-500">Product or Sector</div><div className="font-semibold text-slate-900">{inventoryRow.producto} ({inventoryRow.sector})</div></div>
            <div><div className="text-slate-500">Quantity Ordered</div><div className="font-semibold text-slate-900">{salesOrder?.cases || '-'}</div></div>
            <div><div className="text-slate-500">Specification Ordered</div><div className="font-semibold text-slate-900">{salesOrder?.description || '-'}</div></div>
            <div><div className="text-slate-500">Quantity Received</div><div className="font-semibold text-slate-900">{inventoryRow.cajasInv}</div></div>
            <div><div className="text-slate-500">Specification Received</div><div className="font-semibold text-slate-900">{inventoryRow.descripcion}</div></div>
            <div><div className="text-slate-500">Product Date</div><div className="font-semibold text-slate-900">{inventoryRow.produccion}</div></div>
            <div><div className="text-slate-500">AWB</div><div className="font-semibold text-slate-900 font-mono">{inventoryRow.awb || '-'}</div></div>
            <div><div className="text-slate-500">ETA</div><div className="font-semibold text-slate-900">{inventoryRow.eta}</div></div>
            <div><div className="text-slate-500">Sales Order</div><div className="font-semibold text-slate-900 font-mono">{salesOrder?.orden || '-'}</div></div>
          </div>
          
          <h3 className="font-semibold mt-6 mb-2 text-sm">Allocated Cases Detail</h3>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-[11px]">
              <thead className="bg-slate-50"><tr className="text-left text-slate-500"><th className="py-2 px-2">Allocation ID</th><th className="px-2">End Customer</th><th className="px-2 text-right">Cases</th></tr></thead>
              <tbody>
                {assignedItemsInThisLot.map((item, idx) => {
                  const assignment = assignments.find(a => a.items.includes(item));
                  return (<tr key={idx} className="border-b last:border-0"><td className="py-2 px-2 font-mono">{assignment?.id}</td><td className="px-2">{assignment?.cliente}</td><td className="px-2 text-right font-semibold">{item.cajas}</td></tr>);
                })}
                 {assignedItemsInThisLot.length === 0 && (<tr><td colSpan={3} className="text-center text-gray-400 py-3">No cases allocated from this lot yet.</td></tr>)}
              </tbody>
            </table>
          </div>

          <h3 className="font-semibold mt-6 mb-2 text-sm">Shipment History</h3>
          <ul className="space-y-2 text-sm text-gray-600 border-t pt-3">
            {inventoryRow.statusHistory.slice().reverse().map((h, i) => (
              <li key={i} className="flex items-center gap-3"><span className="font-medium text-gray-800 w-44">{formatDateTime(h.at)}</span><Badge text={h.status} /></li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}