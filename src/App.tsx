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
  Ship,
  Anchor
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
// ESTILOS GLOBALES Y FUENTES (Inyección de CSS)
// =====================================================================
// Inyectamos la fuente Quicksand (pág 24 del manual) y definimos variables CSS
const BrandStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Quicksand:wght@400;500;600;700&display=swap');

    :root {
      --aq-blue: #425563;       /* Pantone 7545 C */
      --aq-orange: #FE5000;     /* Pantone 021 C */
      --aq-warm-gray: #D7D2CB;  /* Pantone Warm Gray 1 */
      --aq-dark-gray: #6E6259;  /* Warm Gray 11 (Textos) */
      --aq-turquoise: #279989;  /* Complementario 1 */
      --aq-olive: #76881D;      /* Complementario 2 */
      --aq-yellow: #DAAA00;     /* Complementario 3 */
      --aq-bg-light: #F9F8F6;   /* Versión muy clara de Warm Gray para UI */
    }

    body {
      font-family: 'Merriweather', serif; /* Sustituto web para Charter ITC */
      background-color: var(--aq-bg-light);
      color: var(--aq-blue);
    }

    h1, h2, h3, h4, .brand-font {
      font-family: 'Quicksand', sans-serif; /* Tipografía complementaria del manual */
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Botones Primarios (Naranja Toque) */
    .btn-primary {
      background-color: var(--aq-orange);
      color: white;
      transition: all 0.2s;
    }
    .btn-primary:hover {
      background-color: #e64600;
    }

    /* Botones Secundarios (Azul Corporativo) */
    .btn-secondary {
      background-color: var(--aq-blue);
      color: white;
    }
    .btn-secondary:hover {
      background-color: #354451;
    }

    /* Inputs y Selects estilo "Papelería" */
    .input-brand {
      border: 1px solid #D7D2CB;
      background-color: white;
      font-family: 'Quicksand', sans-serif;
      color: var(--aq-blue);
    }
    .input-brand:focus {
      outline: none;
      border-color: var(--aq-orange);
      ring: 1px solid var(--aq-orange);
    }
    
    /* Tablas */
    .table-header {
      background-color: #F0EFE9; /* Warm gray very light */
      color: var(--aq-blue);
      font-family: 'Quicksand', sans-serif;
      font-weight: 700;
      font-size: 0.75rem;
    }
  `}</style>
);

// =====================================================================
// UTILIDADES GLOBALES
// =====================================================================
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const uid = () => Math.random().toString(36).slice(2);

// Colores de Marca para Gráficos (Pág 17 del manual)
const BRAND_CHART_COLORS = [
  "#FE5000", // Naranja
  "#425563", // Azul
  "#279989", // Turquesa
  "#76881D", // Verde Oliva
  "#DAAA00", // Amarillo
  "#6E6259", // Gris Oscuro
];

// =====================================================================
// DEFINICIÓN DE TIPOS Y ESTADOS
// =====================================================================

export type TrackingStatus = "CONFIRMADO" | "EN_TRANSITO" | "LISTO_ENTREGA" | "ENTREGADO" | "RETRASO" | "INCIDENCIA";
type AssignmentTipo = "ORDEN" | "SPOT";
type AssignmentEstado = "ACTIVA" | "ANULADA";
type TabId = "dashboard" | "inventory" | "orders" | "assignments" | "categories" | "warehouse" | "clientUpdate";

const TAB_CONFIG: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "dashboard", label: "Dashboard", icon: Layers },
  { id: "inventory", label: "Inventory", icon: Warehouse },
  { id: "orders", label: "Orders", icon: FileText },
  { id: "warehouse", label: "Warehouses", icon: Warehouse },
  { id: "assignments", label: "Allocations", icon: ClipboardList },
  { id: "clientUpdate", label: "Tracking", icon: Mail },
  { id: "categories", label: "Categories", icon: PieChartIcon },
];

type InventoryRow = {
  id: string;
  customId?: string;
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

type StoredAssignment = Omit<Assignment, "items"> & { items?: OrderItem[] };
type CombinedTrackingLink = { token: string; inventoryIds: string[]; cliente: string; createdAt: string };
type InventoryFormPayload = Omit<InventoryRow, "totalLbs" | "cajasInv" | "activo" | "clientes" | "statusHistory" | "trackingToken" | "fechaCierre"> & { cajasDisponibles: number; id?: string };

const sanitizeAssignment = (data: StoredAssignment): Assignment => ({
  ...data,
  items: Array.isArray(data.items) ? data.items : [],
});

const getAssignmentItems = (assignment: Pick<Assignment, "items">) =>
  Array.isArray(assignment.items) ? assignment.items : [];

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
const SALES_ORDERS_LS_KEY = "sales_orders_v1";
const COMBINED_LINKS_LS_KEY = "combined_links_v1";

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

  // Diseño de email adaptado a la marca (Azul corporativo + Naranja)
  return `
    <!DOCTYPE html>
    <html lang="en">
    <body style="font-family: 'Times New Roman', serif; margin: 0; padding: 20px; background-color: #F9F8F6;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td align="center">
            <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-top: 5px solid #FE5000; border-bottom: 1px solid #D7D2CB;">
              <tr>
                <td style="padding: 30px; background-color: #425563; color: #ffffff;" align="center">
                   <!-- En prod: src="https://tuservidor.com/aquachile_logo_white.png" -->
                   <h1 style="margin: 0; font-family: sans-serif; font-weight: 300; letter-spacing: 2px;">AQUACHILE</h1>
                   <p style="margin-top:10px; font-size: 12px; color: #D7D2CB; text-transform: uppercase;">Order Status Update</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <p style="font-size: 16px; color: #425563;">Dear ${inventoryRow.clientePrincipal},</p>
                  <p style="font-size: 16px; color: #6E6259;">This is an update regarding your shipment. The current status is now:</p>
                  <div style="padding: 15px; background-color: #F0EFE9; border-left: 4px solid #FE5000; margin: 25px 0; font-size: 18px; font-weight: bold; color: #425563; font-family: sans-serif;">
                    ${statusLabel}
                  </div>
                  <p style="font-size: 14px; color: #6E6259; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Shipment Details:</p>
                  <ul style="list-style: none; padding: 0; font-size: 15px; color: #425563; line-height: 1.8;">
                    <li style="border-bottom: 1px solid #eee; padding: 5px 0;"><strong>Customer PO:</strong> ${inventoryRow.customerPO}</li>
                    <li style="border-bottom: 1px solid #eee; padding: 5px 0;"><strong>AquaChile Lot:</strong> ${inventoryRow.po}</li>
                    <li style="border-bottom: 1px solid #eee; padding: 5px 0;"><strong>Material:</strong> ${inventoryRow.material}</li>
                    <li style="border-bottom: 1px solid #eee; padding: 5px 0;"><strong>ETA:</strong> ${inventoryRow.eta}</li>
                  </ul>
                  <p style="font-size: 16px; text-align: center; margin-top: 40px;">
                    <a href="${trackingLink}" style="background-color: #FE5000; color: #ffffff; padding: 12px 30px; text-decoration: none; font-weight: bold; font-family: sans-serif; text-transform: uppercase; letter-spacing: 1px;">
                      Track Order
                    </a>
                  </p>
                </td>
              </tr>
              <tr style="background-color: #F9F8F6;">
                <td style="padding: 20px; text-align: center; font-size: 11px; color: #999;">
                  AquaChile Automated Notification. <br/> Please do not reply to this email.
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
  { id: "row-1", customId: "1001", ubicacion: "Miami, FL", bodega: "MIA-1", planta: "Magallanes", produccion: "2025-11-03", eta: "2025-11-10", po: "40538940", customerPO: "PO-AC-001", time: "AM", awb: null, clientePrincipal: "AquaChile MIA", clientes: ["AquaChile MIA"], material: "1113199", descripcion: "SA TD Pr 4-5 LB#Bo Cp 35LB AQ", producto: "TD 4-5 35", sector: "SA", trim: "TD", size: "4-5", escamas: null, formatoCaja: 35, totalLbs: 175 * 35, empacado: "FILETES", cajasOrden: 175, cajasInv: 175, activo: true, status: "EN_TRANSITO", statusHistory: [{ at: new Date().toISOString(), status: "CONFIRMADO" }, { at: new Date().toISOString(), status: "EN_TRANSITO" }], trackingToken: uid() },
  { id: "row-3", customId: "1002", ubicacion: "Miami, FL", bodega: "MIA-2", planta: "Cardonal", produccion: "2025-11-04", eta: "2025-11-12", po: "40538656", customerPO: "PO-SM-002", time: "PM", awb: "123-45678901", clientePrincipal: "Santa Monica", clientes: ["Santa Monica"], material: "1113198", descripcion: "SA TD Pr 3-4 LB#Bo Cp 35LB AQ", producto: "TD 3-4 35", sector: "SA", trim: "TD", size: "3-4", escamas: "Se", formatoCaja: 35, totalLbs: 65 * 35, empacado: "FILETES", cajasOrden: 65, cajasInv: 65, activo: true, status: "CONFIRMADO", statusHistory: [{ at: new Date().toISOString(), status: "CONFIRMADO" }], trackingToken: uid() },
];

const sampleSalesOrders: SalesOrder[] = [ { id: "DEM-1001", salesRep: "Juan Pérez", demandId: "DEM-1001", tos: "FOB", shipTo: "AquaChile MIA", pickUpDate: "2025-11-12", brand1: "AquaChile", material: "1113199", description: "SA TD Pr 4-5 LB#Bo Cp 35LB AQ", cases: 120, price: 5.4, flex: "Sí", incoterm: "FOB MIA", truck: "Truck 1", customerPO: "PO-AC-001", portEntry: "Miami", week: "W46", estadoAprobacion: "APROBADA", estadoProgreso: "PENDIENTE ASIGNACIÓN", unidadPrecio: "USD / lb", orden: "SO-9001", estadoPlanificacion: "PLANIFICADA", especie: "SA", especieDescripcion: "Salmón Atlántico", estadoDetPrecio: "OK", incoterms2: "FOB", brand: "AquaChile", }, { id: "DEM-1002", salesRep: "María López", demandId: "DEM-1002", tos: "CFR", shipTo: "Santa Monica", pickUpDate: "2025-11-13", brand1: "AquaChile", material: "1113198", description: "SA TD Pr 3-4 LB#Bo Cp 35LB AQ", cases: 80, price: 5.1, flex: "No", incoterm: "CFR LAX", truck: "Truck 2", customerPO: "PO-SM-002", portEntry: "Los Angeles", week: "W46", estadoAprobacion: "EN REVISIÓN", estadoProgreso: "PENDIENTE APROBACIÓN", unidadPrecio: "USD / lb", orden: "SO-9002", estadoPlanificacion: "PENDIENTE", especie: "SA", especieDescripcion: "Salmón Atlántico", estadoDetPrecio: "PENDIENTE", incoterms2: "CFR", brand: "AquaChile", }, ];

function loadInventoryFromStorage(): InventoryRow[] {
  if (typeof window === "undefined") return sampleInventoryData;
  try {
    const raw = window.localStorage.getItem(INVENTORY_LS_KEY);
    if (!raw) {
      window.localStorage.setItem(INVENTORY_LS_KEY, JSON.stringify(sampleInventoryData));
      return sampleInventoryData;
    }
    return JSON.parse(raw) as InventoryRow[];
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
    if (!raw) {
      window.localStorage.setItem(ASSIGNMENTS_LS_KEY, JSON.stringify([]));
      return [];
    }
    const sanitized = (JSON.parse(raw) as StoredAssignment[]).filter(Boolean).map(sanitizeAssignment);
    window.localStorage.setItem(ASSIGNMENTS_LS_KEY, JSON.stringify(sanitized));
    return sanitized;
  } catch { return []; }
}

function saveAssignmentsToStorage(list: Assignment[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ASSIGNMENTS_LS_KEY, JSON.stringify(list));
  } catch { /* ignore */ }
}

function loadCombinedLinksFromStorage(): CombinedTrackingLink[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(COMBINED_LINKS_LS_KEY);
    if (!raw) {
      window.localStorage.setItem(COMBINED_LINKS_LS_KEY, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw) as CombinedTrackingLink[];
    const sanitized = parsed.filter(link => Array.isArray(link?.inventoryIds) && link.inventoryIds.length > 0 && link.token);
    if (sanitized.length !== parsed.length) {
      window.localStorage.setItem(COMBINED_LINKS_LS_KEY, JSON.stringify(sanitized));
    }
    return sanitized;
  } catch {
    return [];
  }
}

function saveCombinedLinksToStorage(list: CombinedTrackingLink[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COMBINED_LINKS_LS_KEY, JSON.stringify(list));
  } catch { /* ignore */ }
}

function loadSalesOrdersFromStorage(): SalesOrder[] {
  if (typeof window === "undefined") return sampleSalesOrders;
  try {
    const raw = window.localStorage.getItem(SALES_ORDERS_LS_KEY);
    if (!raw) {
      window.localStorage.setItem(SALES_ORDERS_LS_KEY, JSON.stringify(sampleSalesOrders));
      return sampleSalesOrders;
    }
    return JSON.parse(raw) as SalesOrder[];
  } catch { return sampleSalesOrders; }
}

function saveSalesOrdersToStorage(list: SalesOrder[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SALES_ORDERS_LS_KEY, JSON.stringify(list));
  } catch { /* ignore */ }
}

function getTrackingLink(invRow: InventoryRow): string {
  if (!invRow.trackingToken) return "";
  const origin = typeof window !== "undefined" && window.location ? window.location.origin : "https://tracking.example";
  return `${origin}/track/${invRow.trackingToken}`;
}

// =====================================================================
// COMPONENTE PRINCIPAL: App
// =====================================================================

export default function App() {
  const [tab, setTab] = useState<TabId>("dashboard");
  const [search, setSearch] = useState("");
  const [inventory, setInventory] = useState<InventoryRow[]>(loadInventoryFromStorage);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(loadSalesOrdersFromStorage);
  const [assignments, setAssignments] = useState<Assignment[]>(loadAssignmentsFromStorage);
  
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [assignmentMode, setAssignmentMode] = useState<AssignmentTipo>("ORDEN");
  const [showNewPOForm, setShowNewPOForm] = useState(false);
  const [editingInventoryRow, setEditingInventoryRow] = useState<InventoryRow | null>(null);
  const [showArchivedAssignments, setShowArchivedAssignments] = useState(false);
  const [showNewSOForm, setShowNewSOForm] = useState(false);
  const [editingSalesOrder, setEditingSalesOrder] = useState<SalesOrder | null>(null);

  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  const isTrackingRoute = path.includes("/track/");
  if (isTrackingRoute) {
    const tokenWithParams = path.split("/track/")[1] || "";
    const token = tokenWithParams.split(/[/?]/)[0];
    const storedInventory = loadInventoryFromStorage();
    const storedAssignments = loadAssignmentsFromStorage();
    const storedSalesOrders = loadSalesOrdersFromStorage();
    const storedCombinedLinks = loadCombinedLinksFromStorage();
    const invRow = storedInventory.find(i => i.trackingToken === token);
    if (invRow) {
      const relatedAssignments = storedAssignments.filter(a => getAssignmentItems(a).some(it => it.inventoryId === invRow.id));
      const relatedSalesOrder = storedSalesOrders.find(so => so.customerPO === invRow.customerPO); 
      return <ClientTrackingView inventoryRow={invRow} assignments={relatedAssignments} salesOrder={relatedSalesOrder} salesOrders={storedSalesOrders} />;
    }
    const combinedEntry = storedCombinedLinks.find(link => link.token === token);
    if (combinedEntry) {
      const rows = combinedEntry.inventoryIds.map(id => storedInventory.find(r => r.id === id)).filter((row): row is InventoryRow => Boolean(row));
      if (rows.length > 0) {
        const relatedAssignments = storedAssignments.filter(asg => getAssignmentItems(asg).some(item => combinedEntry.inventoryIds.includes(item.inventoryId)));
        return <CombinedTrackingView entry={combinedEntry} rows={rows} assignments={relatedAssignments} salesOrders={storedSalesOrders} />;
      }
    }
    return (
        <div className="flex items-center justify-center h-screen bg-[#F9F8F6]">
            <div className="p-8 bg-white shadow-sm rounded-none border-t-4 border-[#FE5000]">
                <h1 className="text-[#425563] text-xl font-bold font-['Quicksand']">Link no válido</h1>
            </div>
        </div>
    );
  }

  const sendTrackingEmail = (inventoryId: string) => {
    const row = inventory.find(r => r.id === inventoryId);
    if (!row) return;
    
    let recipientEmail = clientDirectory[row.clientePrincipal]?.email;
    if (!recipientEmail) {
      const enteredEmail = prompt(`Please enter the email for ${row.clientePrincipal}:`);
      if (!enteredEmail || !enteredEmail.includes('@')) return;
      recipientEmail = enteredEmail;
    }
    
    const emailBody = composeTrackingEmailHTML(row);
    console.log("--- SIMULATING EMAIL ---");
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

  const trackingInventory = useMemo(() => inventory.filter(row => row.status !== "ENTREGADO"), [inventory]);
  
  const handleCreateNewSalesOrder = (data: Omit<SalesOrder, 'id'>) => {
    const newOrder: SalesOrder = { ...data, id: `DEM-${uid()}` };
    setSalesOrders(prev => {
      const nextState = [newOrder, ...prev];
      saveSalesOrdersToStorage(nextState);
      return nextState;
    });
    setShowNewSOForm(false);
  };

  const handleUpdateSalesOrder = (data: SalesOrder) => {
    setSalesOrders(prev => {
      const nextState = prev.map(order => order.id === data.id ? data : order);
      saveSalesOrdersToStorage(nextState);
      return nextState;
    });
    setEditingSalesOrder(null);
  };

  const handleCreateNewPO = (data: InventoryFormPayload) => {
    const now = new Date().toISOString();
    const newPO: InventoryRow = {
      ...data,
      id: `row-${uid()}`,
      customId: data.customId || "",
      cajasInv: data.cajasDisponibles,
      totalLbs: data.cajasDisponibles * data.formatoCaja,
      clientes: [data.clientePrincipal],
      activo: data.cajasDisponibles > 0,
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

  const handleUpdatePO = (data: InventoryFormPayload) => {
    if (!data.id) return;
    setInventory(prev => {
      const nextState = prev.map(row => {
        if (row.id !== data.id) return row;
        const statusHistory = data.status !== row.status ? [...row.statusHistory, { at: new Date().toISOString(), status: data.status }] : row.statusHistory;
        return {
          ...row,
          ...data,
          cajasInv: data.cajasDisponibles,
          cajasOrden: data.cajasOrden,
          totalLbs: data.cajasDisponibles * data.formatoCaja,
          clientes: [data.clientePrincipal],
          activo: data.cajasDisponibles > 0,
          statusHistory,
        };
      });
      saveInventoryToStorage(nextState);
      return nextState;
    });
    setEditingInventoryRow(null);
  };
  
  const handleUpdateInventoryStatus = (rowId: string, newStatus: TrackingStatus) => {
    setInventory(prev => {
      const nextState = prev.map(row => {
        if (row.id !== rowId) return row;
        return { ...row, status: newStatus, statusHistory: [...row.statusHistory, { at: new Date().toISOString(), status: newStatus }] };
      });
      saveInventoryToStorage(nextState);
      return nextState;
    });
  };

  const handleCreateAssignment = (data: { tipo: AssignmentTipo; salesOrderId?: string; spotCliente?: string; spotRef?: string; items: OrderItem[] }) => {
    const cliente = data.tipo === "ORDEN" ? (salesOrders.find(s => s.id === data.salesOrderId)?.shipTo ?? "") : (data.spotCliente ?? "");
    if (!cliente) { alert("Cliente no encontrado."); return; }
    
    const hasStock = data.items.every(item => { const invItem = inventory.find(i => i.id === item.inventoryId); return invItem && invItem.cajasInv >= item.cajas; });
    if (!hasStock) { alert("Stock insuficiente."); return; }

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

  const handleCreateCombinedTrackingLink = (inventoryIds: string[]): string | null => {
    if (inventoryIds.length < 2) { alert("Selecciona al menos dos lotes para combinar."); return null; }
    const rows = inventory.filter(r => inventoryIds.includes(r.id));
    if (rows.length !== inventoryIds.length) { alert("No se encontraron todos los lotes seleccionados."); return null; }
    const clientes = new Set(rows.map(r => r.clientePrincipal));
    if (clientes.size > 1) { alert("Solo puedes combinar lotes del mismo cliente."); return null; }
    const token = `combo-${uid()}`;
    const entry: CombinedTrackingLink = { token, inventoryIds, cliente: rows[0].clientePrincipal, createdAt: new Date().toISOString() };
    const existing = loadCombinedLinksFromStorage();
    saveCombinedLinksToStorage([entry, ...existing]);
    const origin = typeof window !== "undefined" && window.location ? window.location.origin : "";
    const link = `${origin}/track/${token}`;
    if (typeof window !== "undefined") {
      window.prompt("Link combinado creado. Copia y comparte:", link);
    }
    return link;
  };

  const handleToggleAssignmentState = (id: string, to: AssignmentEstado) => {
    const asg = assignments.find(a => a.id === id);
    if (!asg) return;

    if (to === 'ANULADA') {
      if (!window.confirm("¿Anular esta asignación y devolver stock?")) return;
      setInventory(prevInv => {
        const nextState = prevInv.map(r => {
          const returnedItem = getAssignmentItems(asg).find(it => it.inventoryId === r.id);
          if (!returnedItem) return r;
          return { ...r, cajasInv: r.cajasInv + returnedItem.cajas, activo: true };
        });
        saveInventoryToStorage(nextState);
        return nextState;
      });
    } else {
      const hasStock = getAssignmentItems(asg).every(item => { const invItem = inventory.find(i => i.id === item.inventoryId); return invItem && invItem.cajasInv >= item.cajas; });
      if (!hasStock) { alert("Stock insuficiente para reactivar."); return; }
      setInventory(prevInv => {
        const nextState = prevInv.map(r => {
        const assignedItem = getAssignmentItems(asg).find(it => it.inventoryId === r.id);
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
      <BrandStyles />
      <Header />
      <div className="min-h-screen">
        <header className="bg-[#425563] text-white sticky top-0 z-20 shadow-md">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-full flex flex-col gap-3">
              <div className="sm:hidden">
                <label className="sr-only" htmlFor="mobile-tab-select">Select section</label>
                <select
                  id="mobile-tab-select"
                  value={tab}
                  onChange={(e) => setTab(e.target.value as TabId)}
                  className="w-full bg-white/10 text-white uppercase text-xs font-['Quicksand'] tracking-wide px-3 py-2 border border-white/20"
                >
                  {TAB_CONFIG.map(({ id, label }) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>
              </div>
              <nav className="hidden sm:flex flex-wrap gap-2 text-xs sm:text-sm font-['Quicksand'] tracking-wide overflow-x-auto pb-1">
                {TAB_CONFIG.map(({ id, label, icon }) => (
                  <NavButton key={id} active={tab === id} onClick={() => setTab(id)} icon={icon} label={label} />
                ))}
              </nav>
            </div>
            {tab === "inventory" && (
              <div className="sm:ml-auto relative w-full sm:w-auto">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-[#D7D2CB]" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="SEARCH..." className="pl-8 pr-3 py-2 rounded-sm bg-[#354451] text-xs text-white w-full sm:w-64 border border-[#6E6259] focus:border-[#FE5000] focus:outline-none font-['Quicksand'] uppercase" />
              </div>
            )}
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
          {tab === "dashboard" && ( <DashboardView kpis={kpis} agg={dashboardAgg} /> )}
          {tab === "inventory" && ( <InventoryView rows={filteredInventory} onNewPO={() => setShowNewPOForm(true)} onEdit={setEditingInventoryRow} /> )}
          {tab === "warehouse" && ( <WarehouseView inventory={inventory.filter(r => r.activo)} /> )}
          {tab === "assignments" && ( <AssignmentsView assignments={assignments} salesOrders={salesOrders} onToggleState={handleToggleAssignmentState} onNewAssignmentOrden={() => { setAssignmentMode("ORDEN"); setShowAssignmentForm(true); }} onNewAssignmentSpot={() => { setAssignmentMode("SPOT"); setShowAssignmentForm(true); }} showArchived={showArchivedAssignments} onToggleArchived={() => setShowArchivedAssignments(prev => !prev)} /> )}
          {tab === "clientUpdate" && ( <ClientUpdateView inventory={trackingInventory} onStatusChange={handleUpdateInventoryStatus} onSendEmail={sendTrackingEmail} onCreateCombinedLink={handleCreateCombinedTrackingLink} /> )}
          {tab === 'orders' && <SalesOrdersView orders={salesOrders} onNewOrder={() => setShowNewSOForm(true)} onEditOrder={setEditingSalesOrder} />}
          {tab === "categories" && <CategoriesView summary={categorySummary} />}
        </main>
      </div>

      {showAssignmentForm && <AssignmentForm mode={assignmentMode} inventory={inventory.filter(r => r.activo && r.cajasInv > 0)} salesOrders={salesOrders} onCreate={handleCreateAssignment} onCancel={() => setShowAssignmentForm(false)} />}
      {showNewPOForm && <NewPOForm mode="create" onSubmit={handleCreateNewPO} onCancel={() => setShowNewPOForm(false)} />}
      {editingInventoryRow && <NewPOForm mode="edit" initialData={editingInventoryRow} onSubmit={handleUpdatePO} onCancel={() => setEditingInventoryRow(null)} />}
      {showNewSOForm && <NewSalesOrderForm mode="create" onCreate={handleCreateNewSalesOrder} onCancel={() => setShowNewSOForm(false)} />}
      {editingSalesOrder && <NewSalesOrderForm mode="edit" initialData={editingSalesOrder} onUpdate={handleUpdateSalesOrder} onCancel={() => setEditingSalesOrder(null)} />}
    </>
  );
}

// =====================================================================
// COMPONENTES AUXILIARES Y DE VISTAS
// =====================================================================

function Header() {
  return ( 
    <div className="w-full flex items-center gap-3 px-8 py-4 bg-white border-b border-[#D7D2CB]">
        {/* Usamos el texto del logo con la fuente Quicksand si no carga la imagen, o la imagen original */}
        <div className="flex items-center gap-2">
            <img src="/aquachile_logo.png" alt="AquaChile" className="h-10 object-contain" />
            {/* Fallback visual style mimicking logo text */}
            <div className="hidden flex-col">
                <span className="font-['Quicksand'] text-3xl text-[#425563] uppercase tracking-widest font-light">AquaChile</span>
            </div>
        </div>
    </div> 
  );
}

function Badge({ text }: { text: string }) {
  const key = text.toUpperCase();
  const colors: Record<string, string> = { 
    "EN_TRANSITO": "bg-[#FFEEE6] text-[#B93800] border-[#FE5000]",
    "CONFIRMADO": "bg-[#E4ECF2] text-[#1E3A53] border-[#425563]",
    "LISTO_ENTREGA": "bg-[#FFF3CC] text-[#9E7700] border-[#DAAA00]",
    "ENTREGADO": "bg-[#E3F2D9] text-[#4A5B00] border-[#76881D]",
    "RETRASO": "bg-[#FFE3E3] text-[#B42318] border-[#B42318]",
    "INCIDENCIA": "bg-[#FFE3E3] text-[#B42318] border-[#B42318]",
    "ANULADA": "bg-[#E7E2DD] text-[#4C4038] border-[#4C4038]",
    "APROBADA": "bg-[#E3F2D9] text-[#4A5B00] border-[#76881D]",
    "EN REVISIÓN": "bg-[#FFF3CC] text-[#9E7700] border-[#DAAA00]",
    "ORDEN": "bg-[#E4ECF2] text-[#1E3A53] border-[#425563]",
    "SPOT": "bg-[#D9F4EF] text-[#1E7A70] border-[#279989]",
    "ACTIVA": "bg-[#E3F2D9] text-[#4A5B00] border-[#76881D]"
  };
  
  const style = colors[key] || "bg-[#D7D2CB] text-[#6E6259] border-[#6E6259]";
  const label = STATUS_LABELS[key as TrackingStatus] ?? text.replace(/_/g, " ");
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-['Quicksand'] font-bold uppercase tracking-wider border ${style}`}>
        {label}
    </span>
  );
}

function NavButton({ active, onClick, icon: Icon, label,}: { active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string; }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 flex items-center gap-2 text-xs font-bold uppercase transition-all ${ active ? "bg-[#FE5000] text-white" : "text-[#D7D2CB] hover:text-white" }`}>
        <Icon className="h-4 w-4" />{label}
    </button>
  );
}

function DashboardView({ kpis, agg }: { kpis: { totalCajasInv: number; totalAssignments: number; pendingOrders: number; totalLbsAvailable: number; }; agg: DashboardAgg; }) {
  return (
    <div className="space-y-8">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[{ id: "stock", label: "Cajas en Inventario", icon: Package }, { id: "pendingOrders", label: "Órdenes Pendientes", icon: FileText }, { id: "assignments", label: "Asignaciones", icon: ClipboardList }, { id: "totalLbs", label: "Lbs Disponibles", icon: Layers }].map(({ id, label, icon: Icon }) => {
          const value = id === "stock" ? kpis.totalCajasInv : id === "pendingOrders" ? kpis.pendingOrders : id === "assignments" ? kpis.totalAssignments : kpis.totalLbsAvailable;
          return ( 
            <motion.div key={id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 shadow-sm border-t-4 border-[#425563]">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-[#F9F8F6] rounded-full"><Icon className="h-6 w-6 text-[#FE5000]" /></div>
                </div>
                <div>
                    <div className="text-xs font-['Quicksand'] font-bold text-[#6E6259] uppercase tracking-wider mb-1">{label}</div>
                    <div className="text-3xl font-['Merriweather'] text-[#425563]">{id === 'totalLbs' ? value.toLocaleString() : value}</div>
                </div>
            </motion.div> 
          );
        })}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 shadow-sm border border-[#D7D2CB]">
            <h3 className="text-sm font-bold text-[#425563] mb-6 border-b border-[#FE5000] pb-2 inline-block">INVENTARIO POR BODEGA</h3>
            <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={agg.byWarehouse}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" /><XAxis dataKey="bodega" tick={{fill: '#6E6259', fontSize: 10}} axisLine={false} /><YAxis tick={{fill: '#6E6259', fontSize: 10}} axisLine={false} /><Tooltip contentStyle={{backgroundColor: '#425563', color: '#fff', border: 'none'}} /><Bar dataKey="totalCajas" name="Cajas" fill="#425563" barSize={30} /></BarChart></ResponsiveContainer></div>
        </div>
        <div className="bg-white p-6 shadow-sm border border-[#D7D2CB]">
            <h3 className="text-sm font-bold text-[#425563] mb-6 border-b border-[#FE5000] pb-2 inline-block">ESTADO DE INVENTARIO</h3>
            <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={agg.byStatus}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" /><XAxis dataKey="status" tick={{fill: '#6E6259', fontSize: 10}} axisLine={false} /><YAxis tick={{fill: '#6E6259', fontSize: 10}} axisLine={false} /><Tooltip contentStyle={{backgroundColor: '#425563', color: '#fff', border: 'none'}} /><Bar dataKey="cajas" name="Cajas" fill="#279989" barSize={30} /></BarChart></ResponsiveContainer></div>
        </div>
      </div>
    </div>
  );
}

function InventoryView({ rows, onNewPO, onEdit }: { rows: InventoryRow[]; onNewPO: () => void; onEdit: (row: InventoryRow) => void; }) {
  return (
    <div className="bg-white shadow-sm border border-[#D7D2CB]">
      <div className="p-6 border-b border-[#D7D2CB] flex items-center justify-between">
        <div><h2 className="text-lg font-bold text-[#425563]">Inventario</h2><p className="text-xs text-[#6E6259] mt-1">Listado de lotes disponibles.</p></div>
        <button onClick={onNewPO} className="btn-primary px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2"><Plus className="h-4 w-4" /> Nuevo Lote</button>
      </div>
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-xs text-[#6E6259] min-w-[1200px]">
          <thead>
            <tr className="table-header">
              <th className="py-3 px-4 text-left">ID</th>
              <th className="px-4 text-left">AquaChile Lot</th>
              <th className="px-4 text-left">Customer PO</th>
              <th className="px-4 text-left">Material</th>
              <th className="px-4 text-left">Description</th>
              <th className="px-4 text-left">Product</th>
              <th className="px-4 text-left">Trim</th>
              <th className="px-4 text-left">Size</th>
              <th className="px-4 text-left">Sector</th>
              <th className="px-4 text-left">Client</th>
              <th className="px-4 text-left">Warehouse</th>
              <th className="px-4 text-left">Location</th>
              <th className="px-4 text-left">Production Date</th>
              <th className="px-4 text-left">Request ETA</th>
              <th className="px-4 text-left">Time</th>
              <th className="px-4 text-left">AWB</th>
              <th className="px-4 text-left">Status</th>
              <th className="px-4 text-right">Cases Ordered</th>
              <th className="px-4 text-right">Cases Available</th>
              <th className="px-4 text-right">Format (lb)</th>
              <th className="px-4 text-right">Total Lbs</th>
              <th className="px-4 text-right">Edit</th>
            </tr>
          </thead>
          <tbody className="font-['Merriweather']">
            {rows.map(r => {
              const displayId = r.customId || r.id;
              const availableLbs = r.cajasInv * r.formatoCaja;
              return (
                <tr key={r.id} className="border-b border-[#F0EFE9] hover:bg-[#F9F8F6]">
                  <td className="py-3 px-4 font-bold text-[#425563]">{displayId}</td>
                  <td className="px-4">{r.po}</td>
                  <td className="px-4">{r.customerPO}</td>
                  <td className="px-4">{r.material}</td>
                  <td className="px-4">{r.descripcion}</td>
                  <td className="px-4">{r.producto}</td>
                  <td className="px-4">{r.trim}</td>
                  <td className="px-4">{r.size}</td>
                  <td className="px-4">{r.sector}</td>
                  <td className="px-4">{r.clientePrincipal}</td>
                  <td className="px-4">{r.bodega}</td>
                  <td className="px-4">{r.ubicacion}</td>
                  <td className="px-4">{r.produccion}</td>
                  <td className="px-4">{r.eta}</td>
                  <td className="px-4">{r.time}</td>
                  <td className="px-4">{r.awb || "Pending"}</td>
                  <td className="px-4"><Badge text={r.status} /></td>
                  <td className="px-4 text-right font-bold">{r.cajasOrden.toLocaleString()}</td>
                  <td className="px-4 text-right font-bold text-[#425563]">{r.cajasInv.toLocaleString()}</td>
                  <td className="px-4 text-right">{r.formatoCaja.toLocaleString()}</td>
                  <td className="px-4 text-right font-bold text-[#425563]">{availableLbs.toLocaleString()}</td>
                  <td className="px-4 text-right">
                    <button onClick={() => onEdit(r)} className="text-[#FE5000] font-bold text-[10px] uppercase hover:underline">Edit</button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && ( <tr><td colSpan={21} className="text-center py-8 text-[#D7D2CB] italic">No hay datos disponibles.</td></tr> )}
          </tbody>
        </table>
      </div>
      <div className="sm:hidden p-4 space-y-4 bg-[#F9F8F6] border-t border-[#D7D2CB]">
        {rows.map(r => {
          const availableLbs = r.cajasInv * r.formatoCaja;
          return (
            <div key={r.id} className="bg-white shadow-sm border border-[#E5DED5] p-4 space-y-3">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[#6E6259] font-['Quicksand']">ID</div>
                  <div className="text-base font-bold text-[#425563]">{r.customId || r.id}</div>
                  <div className="text-xs text-[#6E6259]">{r.po}</div>
                </div>
                <Badge text={r.status} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px] text-[#425563]">
                <div>
                  <div className="font-bold uppercase text-[#6E6259]">Customer</div>
                  <div>{r.clientePrincipal}</div>
                </div>
                <div>
                  <div className="font-bold uppercase text-[#6E6259]">ETA</div>
                  <div>{r.eta}</div>
                </div>
                <div>
                  <div className="font-bold uppercase text-[#6E6259]">Warehouse</div>
                  <div>{r.bodega}</div>
                </div>
                <div>
                  <div className="font-bold uppercase text-[#6E6259]">Available</div>
                  <div className="font-bold">{r.cajasInv.toLocaleString()} cs</div>
                  <div className="text-[10px] text-[#6E6259]">{availableLbs.toLocaleString()} lbs</div>
                </div>
              </div>
              <div className="text-[11px] text-[#6E6259]">
                <div className="font-bold uppercase">Material</div>
                <div>{r.material}</div>
                <div className="font-bold uppercase mt-2">Description</div>
                <div>{r.descripcion}</div>
              </div>
              <div className="flex justify-end">
                <button onClick={() => onEdit(r)} className="text-[#FE5000] font-bold text-[11px] uppercase hover:underline">Edit</button>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && <div className="text-center text-[#B4AAA1] italic text-sm">No hay datos disponibles.</div>}
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
    <div className="bg-white p-6 shadow-sm border border-[#D7D2CB]">
      <h2 className="text-lg font-bold text-[#425563] mb-6 border-b border-[#FE5000] pb-2 inline-block">BODEGAS</h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {data.map((wh) => (
          <div key={wh.bodega} className="border border-[#D7D2CB] p-0 bg-[#F9F8F6]">
            <div className="p-4 bg-[#425563] text-white">
                <div className="flex justify-between items-center">
                    <span className="font-['Quicksand'] font-bold text-lg">{wh.bodega}</span>
                    <span className="text-[10px] uppercase tracking-wider opacity-70">{wh.ubicacion}</span>
                </div>
            </div>
            <div className="p-4">
                <div className="flex justify-between text-xs text-[#6E6259] mb-4 border-b border-[#D7D2CB] pb-2">
                    <span>Total Cajas: <strong className="text-[#425563]">{wh.totalCajas.toLocaleString()}</strong></span>
                    <span>Lbs: <strong className="text-[#425563]">{wh.totalLbs.toLocaleString()}</strong></span>
                </div>
                <div className="space-y-2">
                    {wh.productos.map(p => (
                        <div key={p.key} className="flex justify-between text-[11px]">
                            <span className="text-[#6E6259]">{p.producto}</span>
                            <span className="font-bold text-[#425563]">{p.cajas.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoriesView({ summary }: { summary: { key: string; sector: string; trim: string; size: string; cajas: number; }[]; }) {
  return (
    <div className="bg-white p-6 shadow-sm border border-[#D7D2CB]">
      <h2 className="text-lg font-bold text-[#425563] mb-6 border-b border-[#FE5000] pb-2 inline-block">CATEGORÍAS</h2>
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-[#6E6259]">
            <thead><tr className="table-header"><th className="py-2 px-4 text-left">Sector</th><th className="px-4 text-left">Trim</th><th className="px-4 text-left">Size</th><th className="px-4 text-right">Stock (Cajas)</th></tr></thead>
            <tbody className="font-['Merriweather']">{summary.map((r) => (<tr key={r.key} className="border-b border-[#F0EFE9] hover:bg-[#F9F8F6]"><td className="py-2 px-4 font-bold">{r.sector}</td><td className="px-4">{r.trim}</td><td className="px-4">{r.size}</td><td className="px-4 text-right font-bold text-[#425563]">{r.cajas.toLocaleString()}</td></tr>))}</tbody>
          </table>
        </div>
        <div className="bg-[#F9F8F6] border border-[#D7D2CB] p-6 flex items-center justify-center">
          <div className="w-full h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={summary} dataKey="cajas" nameKey="key" outerRadius={80} innerRadius={50} paddingAngle={2}>{summary.map((entry, index) => (<Cell key={entry.key} fill={BRAND_CHART_COLORS[index % BRAND_CHART_COLORS.length]} strokeWidth={0} />))}</Pie><Tooltip contentStyle={{backgroundColor: '#425563', color: '#fff', border: 'none'}} /></PieChart></ResponsiveContainer></div>
        </div>
      </div>
    </div>
  );
}

function AssignmentsView({ assignments, salesOrders, onToggleState, onNewAssignmentOrden, onNewAssignmentSpot, showArchived, onToggleArchived, }: { assignments: Assignment[]; salesOrders: SalesOrder[]; onToggleState: (id: string, to: AssignmentEstado) => void; onNewAssignmentOrden: () => void; onNewAssignmentSpot: () => void; showArchived: boolean; onToggleArchived: () => void; }) {
  const safeAssignments = assignments.filter((a): a is Assignment => Boolean(a && a.id));
  const filteredAssignments = safeAssignments.filter(a => showArchived ? a.estado === 'ANULADA' : a.estado === 'ACTIVA');
  return (
    <div className="bg-white shadow-sm border border-[#D7D2CB]">
      <div className="p-6 border-b border-[#D7D2CB] flex items-center justify-between flex-wrap gap-4">
        <div><h2 className="text-lg font-bold text-[#425563]">Asignaciones</h2><p className="text-xs text-[#6E6259] mt-1">{showArchived ? "Historial Anulado" : "Asignaciones Activas"}</p></div>
        <div className="flex gap-3">
          <button onClick={onToggleArchived} className="px-4 py-2 border border-[#6E6259] text-[#6E6259] text-xs font-bold uppercase hover:bg-[#6E6259] hover:text-white transition-colors"><Archive className="h-3 w-3 inline mr-1" />{showArchived ? "Ver Activas" : "Historial"}</button>
          <button onClick={onNewAssignmentSpot} className="btn-secondary px-4 py-2 text-xs font-bold uppercase flex items-center gap-2"><Plus className="h-3 w-3" /> Venta Spot</button>
          <button onClick={onNewAssignmentOrden} className="btn-primary px-4 py-2 text-xs font-bold uppercase flex items-center gap-2"><Plus className="h-3 w-3" /> Asignar</button>
        </div>
      </div>
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-xs text-[#6E6259]">
          <thead><tr className="table-header"><th className="py-3 px-4 text-left">ID</th><th className="px-4 text-left">Fecha</th><th className="px-4 text-left">Tipo</th><th className="px-4 text-left">Cliente</th><th className="px-4 text-left">Ref</th><th className="px-4 text-right">Cajas</th><th className="px-4 text-right">Acción</th></tr></thead>
          <tbody className="font-['Merriweather']">
            {filteredAssignments.map(asg => {
              const assignmentItems = getAssignmentItems(asg);
              const cajas = assignmentItems.reduce((s, it) => s + it.cajas, 0);
              const ref = asg.tipo === 'ORDEN' ? (salesOrders.find(s => s.id === asg.salesOrderId)?.demandId ?? asg.salesOrderId) : asg.spotRef;
              return (
                <tr key={asg.id} className="border-b border-[#F0EFE9] hover:bg-[#F9F8F6]">
                  <td className="py-3 px-4 font-bold text-[#425563]">{asg.id}</td><td className="px-4">{asg.fecha}</td><td className="px-4"><Badge text={asg.tipo} /></td><td className="px-4">{asg.cliente}</td><td className="px-4">{ref}</td><td className="px-4 text-right font-bold">{cajas}</td>
                  <td className="px-4 text-right">
                    {showArchived ? (<button onClick={() => onToggleState(asg.id, 'ACTIVA')} className="text-[#279989] font-bold hover:underline text-[10px] uppercase"><Undo className="h-3 w-3 inline" /> Reactivar</button>) : (<button onClick={() => onToggleState(asg.id, 'ANULADA')} className="text-red-700 font-bold hover:underline text-[10px] uppercase"><X className="h-3 w-3 inline" /> Anular</button>)}
                  </td>
                </tr>
              );
            })}
            {filteredAssignments.length === 0 && ( <tr><td colSpan={7} className="text-center py-8 text-[#D7D2CB] italic">Sin asignaciones.</td></tr> )}
          </tbody>
        </table>
      </div>
      <div className="sm:hidden p-4 space-y-4 bg-[#F9F8F6] border-t border-[#D7D2CB]">
        {filteredAssignments.map(asg => {
          const assignmentItems = getAssignmentItems(asg);
          const cajas = assignmentItems.reduce((s, it) => s + it.cajas, 0);
          const ref = asg.tipo === "ORDEN" ? (salesOrders.find(s => s.id === asg.salesOrderId)?.demandId ?? asg.salesOrderId) : asg.spotRef;
          return (
            <div key={asg.id} className="bg-white border border-[#E5DED5] shadow-sm p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[10px] uppercase text-[#6E6259] font-bold">Allocation</div>
                  <div className="text-base font-bold text-[#425563]">{asg.id}</div>
                  <div className="text-xs text-[#6E6259]">{asg.fecha}</div>
                </div>
                <Badge text={asg.tipo} />
              </div>
              <div className="text-[11px] text-[#6E6259] space-y-1">
                <div><span className="font-bold uppercase">Client:</span> {asg.cliente}</div>
                <div><span className="font-bold uppercase">Reference:</span> {ref || "—"}</div>
                <div><span className="font-bold uppercase">Cases:</span> <strong className="text-[#425563]">{cajas.toLocaleString()}</strong></div>
              </div>
              <div className="flex items-center justify-between gap-3">
                {showArchived ? (
                  <button onClick={() => onToggleState(asg.id, "ACTIVA")} className="btn-secondary flex-1 text-[10px] font-bold uppercase py-2">
                    <Undo className="h-3 w-3 inline mr-1" /> Reactivar
                  </button>
                ) : (
                  <button onClick={() => onToggleState(asg.id, "ANULADA")} className="btn-primary flex-1 text-[10px] font-bold uppercase py-2 bg-red-600 hover:bg-red-700">
                    <X className="h-3 w-3 inline mr-1" /> Anular
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filteredAssignments.length === 0 && <div className="text-center text-[#B4AAA1] italic text-sm">Sin asignaciones.</div>}
      </div>
    </div>
  );
}

function ClientUpdateView({ inventory, onStatusChange, onSendEmail, onCreateCombinedLink }: { inventory: InventoryRow[]; onStatusChange: (rowId: string, newStatus: TrackingStatus) => void; onSendEmail: (rowId: string) => void; onCreateCombinedLink: (ids: string[]) => string | null; }) {
  const statusOptions: TrackingStatus[] = [ "CONFIRMADO", "EN_TRANSITO", "LISTO_ENTREGA", "ENTREGADO", "RETRASO", "INCIDENCIA", ];
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  useEffect(() => {
    setSelectedRows(prev => prev.filter(id => inventory.some(r => r.id === id)));
  }, [inventory]);

  const toggleSelection = (id: string) => {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const canCombine = selectedRows.length >= 2;

  const handleCombineClick = () => {
    if (!canCombine) {
      alert("Selecciona al menos dos lotes para combinar.");
      return;
    }
    const selectedInventory = inventory.filter(r => selectedRows.includes(r.id));
    const clientes = new Set(selectedInventory.map(r => r.clientePrincipal));
    if (clientes.size > 1) {
      alert("Solo puedes combinar lotes del mismo cliente.");
      return;
    }
    const link = onCreateCombinedLink(selectedRows);
    if (link) {
      setSelectedRows([]);
    }
  };

  return (
    <div className="bg-white shadow-sm border border-[#D7D2CB]">
      <div className="p-6 border-b border-[#D7D2CB] flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#425563]">Tracking Control</h2>
          <p className="text-xs text-[#6E6259] mt-1">Gestión de estado de envíos y notificación a clientes.</p>
        </div>
        <button onClick={handleCombineClick} disabled={!canCombine} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border ${canCombine ? "btn-secondary border-none" : "border-[#A5A1A1] text-[#A5A1A1] cursor-not-allowed"}`}>
          <Layers className="h-3 w-3" /> Combinar Selección
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-[#6E6259]">
          <thead><tr className="table-header"><th className="py-3 px-4 text-left">Select</th><th className="py-3 px-4 text-left">ID</th><th className="px-4 text-left">PO</th><th className="px-4 text-left">Cliente</th><th className="px-4 text-left">Tracking Link</th><th className="px-4 text-left">Status Actual</th><th className="px-4 text-right">Acción Status</th><th className="px-4 text-center">Notificar</th></tr></thead>
          <tbody className="font-['Merriweather']">
            {inventory.map(r => (
              <tr key={r.id} className="border-b border-[#F0EFE9] hover:bg-[#F9F8F6]">
                <td className="py-3 px-4">
                  <input type="checkbox" checked={selectedRows.includes(r.id)} onChange={() => toggleSelection(r.id)} className="h-4 w-4 accent-[#FE5000]" />
                </td>
                <td className="py-3 px-4 font-bold text-[#425563]">{r.customId || r.id}</td>
                <td className="px-4">{r.po}</td>
                <td className="px-4">{r.clientePrincipal}</td>
                <td className="px-4">
                  <a href={getTrackingLink(r)} target="_blank" rel="noreferrer" className="text-[#FE5000] font-bold hover:underline text-[10px] uppercase font-['Quicksand']">
                    View Link
                  </a>
                </td>
                <td className="px-4"><Badge text={r.status} /></td>
                <td className="px-4 text-right">
                  <select value={r.status} onChange={e => onStatusChange(r.id, e.target.value as TrackingStatus)} className="input-brand px-2 py-1 text-[10px] uppercase">
                    {statusOptions.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </td>
                <td className="px-4 text-center">
                  <button onClick={() => onSendEmail(r.id)} className="p-2 rounded-full hover:bg-[#F0EFE9] text-[#425563] transition-colors" title="Enviar Email">
                    <Mail className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SalesOrdersView({ orders, onNewOrder, onEditOrder }: { orders: SalesOrder[], onNewOrder: () => void; onEditOrder: (order: SalesOrder) => void; }) { 
  return (
    <div className="bg-white shadow-sm border border-[#D7D2CB]">
      <div className="p-6 border-b border-[#D7D2CB] flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#425563]">Órdenes de Venta</h2>
        <button onClick={onNewOrder} className="btn-primary px-4 py-2 text-xs font-bold uppercase flex items-center gap-2"><Plus className="h-3 w-3" /> Crear Orden</button>
      </div>
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-xs text-[#6E6259] min-w-[1200px]">
          <thead>
            <tr className="table-header">
              <th className="py-3 px-4 text-left">Sales Rep</th>
              <th className="px-4 text-left">Demand ID</th>
              <th className="px-4 text-left">Customer PO</th>
              <th className="px-4 text-left">Ship To</th>
              <th className="px-4 text-left">Material</th>
              <th className="px-4 text-left">Description</th>
              <th className="px-4 text-right">Cases</th>
              <th className="px-4 text-right">Price</th>
              <th className="px-4 text-left">Pick Up</th>
              <th className="px-4 text-left">TOS</th>
              <th className="px-4 text-left">Incoterm</th>
              <th className="px-4 text-left">Truck</th>
              <th className="px-4 text-left">Port</th>
              <th className="px-4 text-left">Week</th>
              <th className="px-4 text-left">Approval</th>
              <th className="px-4 text-left">Progress</th>
              <th className="px-4 text-left">Flex</th>
              <th className="px-4 text-left">Order #</th>
              <th className="px-4 text-left">Brand</th>
              <th className="px-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="font-['Merriweather']">
            {orders.map(o => (
              <tr key={o.id} className="border-b border-[#F0EFE9] hover:bg-[#F9F8F6]">
                <td className="py-3 px-4 font-bold text-[#425563]">{o.salesRep}</td>
                <td className="px-4">{o.demandId}</td>
                <td className="px-4">{o.customerPO}</td>
                <td className="px-4">{o.shipTo}</td>
                <td className="px-4">{o.material}</td>
                <td className="px-4">{o.description}</td>
                <td className="px-4 text-right font-bold">{o.cases}</td>
                <td className="px-4 text-right">{o.price.toFixed(2)}</td>
                <td className="px-4">{o.pickUpDate}</td>
                <td className="px-4">{o.tos}</td>
                <td className="px-4">{o.incoterm}</td>
                <td className="px-4">{o.truck}</td>
                <td className="px-4">{o.portEntry}</td>
                <td className="px-4">{o.week}</td>
                <td className="px-4"><Badge text={o.estadoAprobacion} /></td>
                <td className="px-4">{o.estadoProgreso}</td>
                <td className="px-4">{o.flex}</td>
                <td className="px-4">{o.orden}</td>
                <td className="px-4">{o.brand}</td>
                <td className="px-4 text-right">
                  <button onClick={() => onEditOrder(o)} className="text-[#FE5000] font-bold text-[10px] uppercase hover:underline">Edit</button>
                </td>
              </tr>
            ))}
             {orders.length === 0 && ( <tr><td colSpan={20} className="text-center py-8 text-[#D7D2CB] italic">No hay órdenes de venta.</td></tr> )}
          </tbody>
        </table>
      </div>
      <div className="sm:hidden p-4 space-y-4 bg-[#F9F8F6] border-t border-[#D7D2CB]">
        {orders.map(o => (
          <div key={o.id} className="bg-white border border-[#E5DED5] shadow-sm p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-[11px] font-bold uppercase text-[#6E6259]">Demand ID</div>
                <div className="text-base font-bold text-[#425563]">{o.demandId}</div>
                <div className="text-xs text-[#6E6259]">{o.customerPO}</div>
              </div>
              <Badge text={o.estadoAprobacion} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-[11px] text-[#425563]">
              <div>
                <div className="font-bold uppercase text-[#6E6259]">Ship To</div>
                <div>{o.shipTo}</div>
              </div>
              <div>
                <div className="font-bold uppercase text-[#6E6259]">Cases</div>
                <div className="font-bold">{o.cases.toLocaleString()}</div>
              </div>
              <div>
                <div className="font-bold uppercase text-[#6E6259]">Price</div>
                <div>${o.price.toFixed(2)}</div>
              </div>
              <div>
                <div className="font-bold uppercase text-[#6E6259]">Incoterm</div>
                <div>{o.incoterm}</div>
              </div>
            </div>
            <div className="text-[11px] text-[#6E6259] space-y-1">
              <div><span className="font-bold uppercase">Pick Up:</span> {o.pickUpDate}</div>
              <div><span className="font-bold uppercase">Port:</span> {o.portEntry}</div>
              <div><span className="font-bold uppercase">Truck:</span> {o.truck}</div>
              <div><span className="font-bold uppercase">Status:</span> {o.estadoProgreso}</div>
            </div>
            <div className="flex justify-end">
              <button onClick={() => onEditOrder(o)} className="text-[#FE5000] font-bold text-[11px] uppercase hover:underline">Edit</button>
            </div>
          </div>
        ))}
        {orders.length === 0 && <div className="text-center text-[#B4AAA1] italic text-sm">No hay órdenes de venta.</div>}
      </div>
    </div>
  );
}

type InventoryFormState = {
  customId: string;
  po: string;
  customerPO: string;
  material: string;
  descripcion: string;
  producto: string;
  clientePrincipal: string;
  ubicacion: string;
  bodega: string;
  planta: string;
  produccion: string;
  eta: string;
  status: TrackingStatus;
  cajasOrden: string;
  formatoCaja: string;
  cajasDisponibles: string;
  sector: string;
  trim: string;
  size: string;
  escamas: string;
  awb: string;
  time: string;
  empacado: string;
};

function NewPOForm({ mode, initialData, onSubmit, onCancel }: { mode: "create" | "edit"; initialData?: InventoryRow; onSubmit: (data: InventoryFormPayload) => void; onCancel: () => void; }) {
  const warehouses = [ { name: "SUC", location: "Miami, FL" }, { name: "EVO LAX", location: "Los Angeles, CA" }, { name: "EVO DFW", location: "Dallas, TX" }, { name: "CARTYS", location: "New York, NY" }, { name: "CARTYS-RFD", location: "Rockford, IL" }, { name: "SFO-CENTRA FREIGHT", location: "San Francisco, CA" }, { name: "ARAHO", location: "Boston, MA" }, { name: "PRIME", location: "Los Angeles, CA" }, { name: "RFD-Direct", location: "Rockford, IL" }, ];
  const productTypes = ["Filetes", "Hon"];
  const productDescriptions = [ "HON 14-16 55", "R TD 2-3 10", "R TD 2-3 35", "R TD 3-4 10", "R TD 2-4 35", "R TD 3-4 SE 35", "R TD 4-5 35", "R TE 2-3 35", "R TE 3-4 35", "R TF 2-5 35", "SG TD 3-4 35", "SG TD Pr 3-4 35", "SG TD Pr 4-5 35", "TD 2-3 10", "TD 2-3 35", "TD 2-3 SE 10", "TD 2-3 SE 35", "TD 3-4 10", "TD 3-4 35", "TD 3-4 SE 10", "TD 3-4 SE 35", "TE 2-3 35", "TE 3-4 35", "TF 2-5 35" ];
  const isEditing = mode === "edit";

  const buildInitialState = (row?: InventoryRow): InventoryFormState => {
    if (!row) {
      return {
        customId: "",
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
        status: "CONFIRMADO",
        cajasOrden: "100",
        formatoCaja: "35",
        cajasDisponibles: "",
        sector: "SA",
        trim: "TD",
        size: "4-5",
        escamas: "",
        awb: "",
        time: "AM",
        empacado: productTypes[0],
      };
    }
    return {
      customId: row.customId || "",
      po: row.po,
      customerPO: row.customerPO,
      material: row.material,
      descripcion: row.descripcion,
      producto: row.producto,
      clientePrincipal: row.clientePrincipal,
      ubicacion: row.ubicacion,
      bodega: row.bodega,
      planta: row.planta,
      produccion: row.produccion,
      eta: row.eta,
      status: row.status,
      cajasOrden: String(row.cajasOrden),
      formatoCaja: String(row.formatoCaja),
      cajasDisponibles: String(row.cajasInv),
      sector: row.sector,
      trim: row.trim,
      size: row.size,
      escamas: row.escamas ?? "",
      awb: row.awb ?? "",
      time: row.time,
      empacado: row.empacado,
    };
  };

  const [formData, setFormData] = useState<InventoryFormState>(() => buildInitialState(initialData));

  useEffect(() => {
    setFormData(buildInitialState(initialData));
  }, [initialData, mode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleWarehouseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = warehouses.find(w => w.name === e.target.value);
    if (selected) setFormData(prev => ({ ...prev, bodega: selected.name, ubicacion: selected.location }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customId || !formData.po || !formData.material) return;
    const cajasOrden = Number(formData.cajasOrden) || 0;
    const formatoCaja = Number(formData.formatoCaja) || 0;
    const cajasDisponiblesValue = formData.cajasDisponibles === "" ? cajasOrden : Number(formData.cajasDisponibles);
    const cajasDisponibles = Number.isFinite(cajasDisponiblesValue) ? cajasDisponiblesValue : cajasOrden;
    onSubmit({
      id: initialData?.id,
      customId: formData.customId,
      po: formData.po,
      customerPO: formData.customerPO,
      material: formData.material,
      descripcion: formData.descripcion,
      producto: formData.producto,
      clientePrincipal: formData.clientePrincipal,
      ubicacion: formData.ubicacion,
      bodega: formData.bodega,
      planta: formData.planta,
      produccion: formData.produccion,
      eta: formData.eta,
      status: formData.status,
      cajasOrden,
      formatoCaja,
      cajasDisponibles,
      sector: formData.sector,
      trim: formData.trim,
      size: formData.size,
      escamas: formData.escamas ? formData.escamas : null,
      awb: formData.awb ? formData.awb : null,
      time: formData.time,
      empacado: formData.empacado,
    });
  };

  return (
    <div className="fixed inset-0 bg-[#425563]/80 flex items-center justify-center z-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white shadow-2xl max-w-3xl w-full p-8 max-h-[90vh] overflow-y-auto border-t-8 border-[#FE5000]">
        <div className="flex items-center justify-between pb-4 border-b border-[#D7D2CB] mb-6">
          <h2 className="text-xl font-bold text-[#425563] font-['Quicksand']">{isEditing ? "EDITAR LOTE DE INVENTARIO" : "NUEVO LOTE DE INVENTARIO"}</h2>
          <button type="button" onClick={onCancel} className="text-[#6E6259] hover:text-[#FE5000]"><X className="h-6 w-6" /></button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-[#6E6259]">
          <div className="space-y-4">
            <div><label className="block font-bold mb-1">Inventory ID (*)</label><input name="customId" value={formData.customId} onChange={handleChange} className="input-brand w-full px-3 py-2" /></div>
            <div><label className="block font-bold mb-1">PO (*)</label><input name="po" value={formData.po} onChange={handleChange} className="input-brand w-full px-3 py-2" /></div>
            <div><label className="block font-bold mb-1">Customer PO</label><input name="customerPO" value={formData.customerPO} onChange={handleChange} className="input-brand w-full px-3 py-2" /></div>
            <div><label className="block font-bold mb-1">Material</label><input name="material" value={formData.material} onChange={handleChange} className="input-brand w-full px-3 py-2" /></div>
            <div><label className="block font-bold mb-1">Descripción</label><select name="descripcion" value={formData.descripcion} onChange={handleChange} className="input-brand w-full px-3 py-2">{productDescriptions.map(desc => (<option key={desc} value={desc}>{desc}</option>))}</select></div>
            <div><label className="block font-bold mb-1">Producto / SKU</label><input name="producto" value={formData.producto} onChange={handleChange} className="input-brand w-full px-3 py-2" /></div>
            <div><label className="block font-bold mb-1">Cliente Principal</label><input name="clientePrincipal" value={formData.clientePrincipal} onChange={handleChange} className="input-brand w-full px-3 py-2" /></div>
            <div><label className="block font-bold mb-1">AWB</label><input name="awb" value={formData.awb} onChange={handleChange} className="input-brand w-full px-3 py-2" placeholder="123-45678901" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block font-bold mb-1">Cajas</label><input type="number" name="cajasOrden" value={formData.cajasOrden} onChange={handleChange} className="input-brand w-full px-3 py-2" /></div>
              <div><label className="block font-bold mb-1">Formato (Lb)</label><input type="number" name="formatoCaja" value={formData.formatoCaja} onChange={handleChange} className="input-brand w-full px-3 py-2" /></div>
            </div>
            <div><label className="block font-bold mb-1">Cajas Disponibles</label><input type="number" name="cajasDisponibles" value={formData.cajasDisponibles} onChange={handleChange} className="input-brand w-full px-3 py-2" placeholder="Igual a Cajas si se deja vacío" /></div>
          </div>
          <div className="space-y-4">
            <div><label className="block font-bold mb-1">Bodega</label><select onChange={handleWarehouseChange} value={formData.bodega} className="input-brand w-full px-3 py-2">{warehouses.map(wh => (<option key={wh.name} value={wh.name}>{wh.name} / {wh.location}</option>))}</select></div>
            <div><label className="block font-bold mb-1">Ubicación</label><input name="ubicacion" value={formData.ubicacion} onChange={handleChange} className="input-brand w-full px-3 py-2" /></div>
            <div><label className="block font-bold mb-1">Planta</label><input name="planta" value={formData.planta} onChange={handleChange} className="input-brand w-full px-3 py-2" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block font-bold mb-1">Prod. Date</label><input type="date" name="produccion" value={formData.produccion} onChange={handleChange} className="input-brand w-full px-3 py-2" /></div>
              <div><label className="block font-bold mb-1">ETA</label><input type="date" name="eta" value={formData.eta} onChange={handleChange} className="input-brand w-full px-3 py-2" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block font-bold mb-1">Horario</label><select name="time" value={formData.time} onChange={handleChange} className="input-brand w-full px-3 py-2"><option value="AM">AM</option><option value="PM">PM</option></select></div>
              <div><label className="block font-bold mb-1">Empacado</label><select name="empacado" value={formData.empacado} onChange={handleChange} className="input-brand w-full px-3 py-2">{productTypes.map(type => (<option key={type} value={type}>{type}</option>))}</select></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
                <div><label className="block font-bold mb-1">Sector</label><input name="sector" value={formData.sector} onChange={handleChange} className="input-brand w-full px-3 py-2" /></div>
                <div><label className="block font-bold mb-1">Trim</label><input name="trim" value={formData.trim} onChange={handleChange} className="input-brand w-full px-3 py-2" /></div>
                <div><label className="block font-bold mb-1">Size</label><input name="size" value={formData.size} onChange={handleChange} className="input-brand w-full px-3 py-2" /></div>
            </div>
            <div><label className="block font-bold mb-1">Escamas</label><input name="escamas" value={formData.escamas} onChange={handleChange} className="input-brand w-full px-3 py-2" placeholder="Opcional" /></div>
            <div><label className="block font-bold mb-1">Status</label><select name="status" value={formData.status} onChange={handleChange} className="input-brand w-full px-3 py-2"><option value="CONFIRMADO">Confirmado</option><option value="EN_TRANSITO">En Tránsito</option></select></div>
          </div>
        </div>
        <div className="flex justify-end gap-4 pt-6 border-t border-[#D7D2CB] mt-6">
          <button type="button" onClick={onCancel} className="text-[#6E6259] font-bold uppercase text-xs hover:text-[#425563]">Cancelar</button>
          <button type="submit" className="btn-primary px-6 py-2 text-xs font-bold uppercase rounded-none">{isEditing ? "Actualizar Lote" : "Guardar Lote"}</button>
        </div>
      </form>
    </div>
  );
}

type SalesOrderFormState = {
  salesRep: string;
  demandId: string;
  tos: string;
  shipTo: string;
  pickUpDate: string;
  brand1: string;
  material: string;
  description: string;
  cases: string;
  price: string;
  flex: string;
  incoterm: string;
  truck: string;
  customerPO: string;
  portEntry: string;
  week: string;
  estadoAprobacion: string;
  estadoProgreso: string;
  unidadPrecio: string;
  orden: string;
  estadoPlanificacion: string;
  especie: string;
  especieDescripcion: string;
  estadoDetPrecio: string;
  incoterms2: string;
  brand: string;
};

function NewSalesOrderForm({ mode, initialData, onCreate, onUpdate, onCancel }: { mode: 'create' | 'edit'; initialData?: SalesOrder; onCreate?: (data: Omit<SalesOrder, 'id'>) => void; onUpdate?: (data: SalesOrder) => void; onCancel: () => void; }) {
  const isEditing = mode === 'edit';
  const baseState: SalesOrderFormState = {
    salesRep: 'Juan Pérez',
    demandId: `DEM-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`,
    tos: 'FOB',
    shipTo: '',
    pickUpDate: new Date().toISOString().slice(0, 10),
    brand1: 'AquaChile',
    material: '',
    description: '',
    cases: '0',
    price: '0',
    flex: 'No',
    incoterm: 'FOB MIA',
    truck: '',
    customerPO: '',
    portEntry: 'Miami',
    week: `W${Math.ceil((new Date().getDate() + new Date().getDay() + 1) / 7)}`,
    estadoAprobacion: 'EN REVISIÓN',
    estadoProgreso: 'PENDIENTE APROBACIÓN',
    unidadPrecio: 'USD / lb',
    orden: '',
    estadoPlanificacion: 'PENDIENTE',
    especie: 'SA',
    especieDescripcion: 'Salmón Atlántico',
    estadoDetPrecio: 'PENDIENTE',
    incoterms2: 'FOB',
    brand: 'AquaChile',
  };

  const mapFromRow = (row: SalesOrder): SalesOrderFormState => ({
    salesRep: row.salesRep,
    demandId: row.demandId,
    tos: row.tos,
    shipTo: row.shipTo,
    pickUpDate: row.pickUpDate,
    brand1: row.brand1,
    material: row.material,
    description: row.description,
    cases: String(row.cases),
    price: String(row.price),
    flex: row.flex,
    incoterm: row.incoterm,
    truck: row.truck,
    customerPO: row.customerPO,
    portEntry: row.portEntry,
    week: row.week,
    estadoAprobacion: row.estadoAprobacion,
    estadoProgreso: row.estadoProgreso,
    unidadPrecio: row.unidadPrecio,
    orden: row.orden,
    estadoPlanificacion: row.estadoPlanificacion,
    especie: row.especie,
    especieDescripcion: row.especieDescripcion,
    estadoDetPrecio: row.estadoDetPrecio,
    incoterms2: row.incoterms2,
    brand: row.brand,
  });

  const [formData, setFormData] = useState<SalesOrderFormState>(initialData ? mapFromRow(initialData) : baseState);

  useEffect(() => {
    setFormData(initialData ? mapFromRow(initialData) : baseState);
  }, [initialData, mode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.demandId || !formData.shipTo) return;
    const payload: Omit<SalesOrder, 'id'> = {
      salesRep: formData.salesRep,
      demandId: formData.demandId,
      tos: formData.tos,
      shipTo: formData.shipTo,
      pickUpDate: formData.pickUpDate,
      brand1: formData.brand1,
      material: formData.material,
      description: formData.description,
      cases: Number(formData.cases) || 0,
      price: Number(formData.price) || 0,
      flex: formData.flex,
      incoterm: formData.incoterm,
      truck: formData.truck,
      customerPO: formData.customerPO,
      portEntry: formData.portEntry,
      week: formData.week,
      estadoAprobacion: formData.estadoAprobacion,
      estadoProgreso: formData.estadoProgreso,
      unidadPrecio: formData.unidadPrecio,
      orden: formData.orden,
      estadoPlanificacion: formData.estadoPlanificacion,
      especie: formData.especie,
      especieDescripcion: formData.especieDescripcion,
      estadoDetPrecio: formData.estadoDetPrecio,
      incoterms2: formData.incoterms2,
      brand: formData.brand,
    };
    if (isEditing && initialData && onUpdate) {
      onUpdate({ ...payload, id: initialData.id });
    } else if (!isEditing && onCreate) {
      onCreate(payload);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#425563]/80 flex items-center justify-center z-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white shadow-2xl max-w-4xl w-full p-8 max-h-[90vh] overflow-y-auto border-t-8 border-[#FE5000]">
        <div className="flex items-center justify-between pb-4 border-b border-[#D7D2CB] mb-6">
          <h2 className="text-xl font-bold text-[#425563] font-['Quicksand']">{isEditing ? 'EDITAR ORDEN DE VENTA' : 'NUEVA ORDEN DE VENTA'}</h2>
          <button type="button" onClick={onCancel} className="text-[#6E6259] hover:text-[#FE5000]"><X className="h-6 w-6" /></button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-[#6E6259]">
            <div className="space-y-4">
              <div><label className="block font-bold mb-1">Demand ID</label><input name="demandId" value={formData.demandId} onChange={handleChange} className="input-brand w-full px-3 py-2" /></div>
              <div><label className="block font-bold mb-1">Ship To</label><input name="shipTo" value={formData.shipTo} onChange={handleChange} className="input-brand w-full px-3 py-2" /></div>
              <div><label className="block font-bold mb-1">Customer PO</label><input name="customerPO" value={formData.customerPO} onChange={handleChange} className="input-brand w-full px-3 py-2" /></div>
              <div><label className="block font-bold mb-1">Material</label><input name="material" value={formData.material} onChange={handleChange} className="input-brand w-full px-3 py-2" /></div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 <div><label className="block font-bold mb-1">Cases</label><input type="number" name="cases" value={formData.cases} onChange={handleChange} className="input-brand w-full px-3 py-2" /></div>
                 <div><label className="block font-bold mb-1">Price</label><input type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} className="input-brand w-full px-3 py-2" /></div>
              </div>
              <div><label className="block font-bold mb-1">Pick up Date</label><input type="date" name="pickUpDate" value={formData.pickUpDate} onChange={handleChange} className="input-brand w-full px-3 py-2" /></div>
              <div><label className="block font-bold mb-1">Approval</label><select name="estadoAprobacion" value={formData.estadoAprobacion} onChange={handleChange} className="input-brand w-full px-3 py-2"><option>EN REVISIÓN</option><option>APROBADA</option></select></div>
            </div>
            <div className="space-y-4">
              <div><label className="block font-bold mb-1">Incoterm</label><input name="incoterm" value={formData.incoterm} onChange={handleChange} className="input-brand w-full px-3 py-2" /></div>
              <div><label className="block font-bold mb-1">Port</label><input name="portEntry" value={formData.portEntry} onChange={handleChange} className="input-brand w-full px-3 py-2" /></div>
              <div><label className="block font-bold mb-1">Sales Order #</label><input name="orden" value={formData.orden} onChange={handleChange} className="input-brand w-full px-3 py-2" placeholder="Opcional" /></div>
            </div>
        </div>
        <div className="flex justify-end gap-4 pt-6 border-t border-[#D7D2CB] mt-6">
          <button type="button" onClick={onCancel} className="text-[#6E6259] font-bold uppercase text-xs hover:text-[#425563]">Cancelar</button>
          <button type="submit" className="btn-primary px-6 py-2 text-xs font-bold uppercase rounded-none">{isEditing ? 'Actualizar Orden' : 'Guardar Orden'}</button>
        </div>
      </form>
    </div>
  );
}

function AssignmentForm({ mode, inventory, salesOrders, onCreate, onCancel }: { mode: AssignmentTipo; inventory: InventoryRow[]; salesOrders: SalesOrder[]; onCreate: (data: { tipo: AssignmentTipo; salesOrderId?: string; spotCliente?: string; spotRef?: string; items: OrderItem[] }) => void; onCancel: () => void; }) {
  const [selectedSalesOrder, setSelectedSalesOrder] = useState<string>(salesOrders[0]?.id ?? "");
  const [spotCliente, setSpotCliente] = useState(inventory[0]?.clientePrincipal ?? "");
  const [spotRef, setSpotRef] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>(() => Object.fromEntries(inventory.map(row => [row.id, 0])));
  const [error, setError] = useState("");

  useEffect(() => {
    setQuantities(Object.fromEntries(inventory.map(row => [row.id, 0])));
    if (mode === "ORDEN" && salesOrders.length > 0) {
      setSelectedSalesOrder(salesOrders[0].id);
    }
    if (mode === "SPOT") {
      setSpotCliente(inventory[0]?.clientePrincipal ?? "");
    }
    setSpotRef("");
    setError("");
  }, [inventory, mode, salesOrders]);

  const handleQtyChange = (inventoryId: string, value: number) => {
    const invRow = inventory.find(r => r.id === inventoryId);
    const maxValue = invRow ? invRow.cajasInv : 0;
    const safeValue = clamp(Number.isNaN(value) ? 0 : value, 0, maxValue);
    setQuantities(prev => ({ ...prev, [inventoryId]: safeValue }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payloadItems = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([inventoryId, qty]) => {
        const invRow = inventory.find(r => r.id === inventoryId);
        if (!invRow) return null;
        return {
          inventoryId,
          po: invRow.po,
          material: invRow.material,
          producto: invRow.producto,
          cajas: qty,
        };
      })
      .filter((item): item is OrderItem => Boolean(item));

    if (!payloadItems.length) {
      setError("Selecciona al menos un lote con cajas asignadas.");
      return;
    }

    if (mode === "ORDEN" && !selectedSalesOrder) {
      setError("Selecciona la orden de venta que deseas asignar.");
      return;
    }

    if (mode === "SPOT" && (!spotCliente || !spotRef)) {
      setError("Completa los datos de la venta spot.");
      return;
    }

    onCreate({
      tipo: mode,
      salesOrderId: mode === "ORDEN" ? selectedSalesOrder : undefined,
      spotCliente: mode === "SPOT" ? spotCliente : undefined,
      spotRef: mode === "SPOT" ? spotRef : undefined,
      items: payloadItems,
    });
  };

  return (
    <div className="fixed inset-0 bg-[#425563]/80 flex items-center justify-center z-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white shadow-2xl max-w-4xl w-full p-8 max-h-[90vh] overflow-y-auto border-t-8 border-[#FE5000]">
        <div className="flex items-center justify-between pb-4 border-b border-[#D7D2CB] mb-6">
          <div>
            <h2 className="text-xl font-bold text-[#425563] font-['Quicksand']">{mode === "ORDEN" ? "Asignar Orden de Venta" : "Crear Venta Spot"}</h2>
            <p className="text-xs text-[#6E6259] uppercase tracking-wider">{mode === "ORDEN" ? "Selecciona la orden y define los lotes" : "Define cliente, referencia y asigna lotes"}</p>
          </div>
          <button type="button" onClick={onCancel} className="text-[#6E6259] hover:text-[#FE5000]"><X className="h-6 w-6" /></button>
        </div>

        {error && <div className="mb-4 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</div>}

        {mode === "ORDEN" ? (
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase text-[#6E6259] mb-2">Orden de Venta</label>
            <select value={selectedSalesOrder} onChange={(e) => setSelectedSalesOrder(e.target.value)} className="input-brand w-full px-3 py-2">
              <option value="">Selecciona una orden</option>
              {salesOrders.map(order => (
                <option key={order.id} value={order.id}>
                  {order.demandId} · {order.shipTo} · {order.customerPO}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-bold uppercase text-[#6E6259] mb-2">Cliente</label>
              <input value={spotCliente} onChange={(e) => setSpotCliente(e.target.value)} className="input-brand w-full px-3 py-2" placeholder="Nombre del cliente" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-[#6E6259] mb-2">Referencia</label>
              <input value={spotRef} onChange={(e) => setSpotRef(e.target.value)} className="input-brand w-full px-3 py-2" placeholder="Referencia interna" />
            </div>
          </div>
        )}

        <div className="border border-[#D7D2CB]">
          <div className="table-header px-4 py-3 text-left">Selecciona los lotes del inventario</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-[#6E6259]">
              <thead>
                <tr className="table-header">
                  <th className="py-3 px-4 text-left">ID</th>
                  <th className="px-4 text-left">PO</th>
                  <th className="px-4 text-left">Cliente</th>
                  <th className="px-4 text-left">Material</th>
                  <th className="px-4 text-left">Bodega</th>
                  <th className="px-4 text-right">Stock</th>
                  <th className="px-4 text-right">Asignar</th>
                </tr>
              </thead>
              <tbody className="font-['Merriweather']">
                {inventory.map(row => (
                  <tr key={row.id} className="border-b border-[#F0EFE9]">
                    <td className="py-3 px-4 font-bold text-[#425563]">{row.customId || row.id}</td>
                    <td className="px-4">{row.po}</td>
                    <td className="px-4">{row.clientePrincipal}</td>
                    <td className="px-4">{row.material}</td>
                    <td className="px-4">{row.bodega}</td>
                    <td className="px-4 text-right font-bold">{row.cajasInv.toLocaleString()}</td>
                    <td className="px-4 text-right">
                      <input
                        type="number"
                        min={0}
                        max={row.cajasInv}
                        value={quantities[row.id] ?? 0}
                        onChange={(e) => handleQtyChange(row.id, Number(e.target.value))}
                        className="input-brand w-24 px-2 py-1 text-right"
                      />
                    </td>
                  </tr>
                ))}
                {inventory.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-[#D7D2CB] py-6 italic">No hay inventario disponible.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t border-[#D7D2CB] mt-6">
          <button type="button" onClick={onCancel} className="text-[#6E6259] font-bold uppercase text-xs hover:text-[#425563]">Cancelar</button>
          <button type="submit" className="btn-primary px-6 py-2 text-xs font-bold uppercase rounded-none flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Confirmar
          </button>
        </div>
      </form>
    </div>
  );
}

function ClientTrackingView({ inventoryRow, assignments, salesOrder, salesOrders = [] }: { inventoryRow: InventoryRow, assignments: Assignment[], salesOrder?: SalesOrder, salesOrders?: SalesOrder[] }) {
  const TRACK_STEPS: { id: TrackingStatus; label: string }[] = [
    { id: "CONFIRMADO", label: "Confirmed" },
    { id: "EN_TRANSITO", label: "In Transit" },
    { id: "LISTO_ENTREGA", label: "Ready for Delivery" },
    { id: "ENTREGADO", label: "Delivered" },
  ];
  const currentStatusIdx = Math.max(0, TRACK_STEPS.findIndex(step => step.id === inventoryRow.status));
  const formatDateTime = (iso?: string) =>
    iso ? new Date(iso).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";

  const orderMap = useMemo(() => new Map(salesOrders.map(order => [order.id, order])), [salesOrders]);

  const assignedItemDetails = assignments.flatMap(asg =>
    getAssignmentItems(asg)
      .filter(item => item.inventoryId === inventoryRow.id)
      .map(item => {
        const linkedOrder = asg.salesOrderId ? orderMap.get(asg.salesOrderId) : undefined;
        return {
          allocationId: asg.id,
          productionDate: inventoryRow.produccion,
          specification: inventoryRow.descripcion,
          cases: item.cajas,
          lbs: item.cajas * inventoryRow.formatoCaja,
          po: inventoryRow.po,
          id: inventoryRow.customId || inventoryRow.id,
          requestEta: linkedOrder?.pickUpDate || inventoryRow.eta,
          awb: inventoryRow.awb || "Pending",
          location: inventoryRow.ubicacion,
          salesOrder: linkedOrder?.demandId || linkedOrder?.orden || asg.spotRef || "Spot Sale",
        };
      })
  );

  const totalCasesAssigned = assignedItemDetails.reduce((sum, item) => sum + item.cases, 0);
  const totalLbsAssigned = assignedItemDetails.reduce((sum, item) => sum + item.lbs, 0);

  const orderSummary = [
    { label: "Customer PO", value: inventoryRow.customerPO },
    { label: "Sales Order", value: salesOrder?.demandId ?? "Pending" },
    { label: "Incoterm", value: salesOrder?.incoterm ?? "—" },
    { label: "ETA", value: inventoryRow.eta },
  ];

  const allocationSummary = [
    { label: "AquaChile Lot", value: inventoryRow.po },
    { label: "Warehouse", value: inventoryRow.bodega },
    { label: "Location", value: inventoryRow.ubicacion },
    { label: "Production", value: inventoryRow.produccion },
    { label: "Request ETA", value: salesOrder?.pickUpDate ?? "—" },
    { label: "AWB", value: inventoryRow.awb ?? "Pending" },
  ];

  const salmonBackground = {
    backgroundColor: "#1a1410",
    backgroundImage: `
      radial-gradient(circle at 30% 35%, rgba(255, 131, 92, 0.75) 0%, rgba(255, 131, 92, 0.15) 28%, transparent 52%),
      radial-gradient(circle at 70% 40%, rgba(255, 104, 60, 0.65) 0%, rgba(255, 104, 60, 0.1) 26%, transparent 55%),
      radial-gradient(circle at 25% 70%, rgba(255, 187, 146, 0.35) 0%, rgba(255, 187, 146, 0.05) 28%, transparent 60%),
      radial-gradient(circle at 65% 75%, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.02) 25%, transparent 55%),
      linear-gradient(160deg, rgba(26, 18, 12, 0.95) 0%, rgba(51, 34, 23, 0.95) 45%, rgba(26, 18, 12, 0.92) 100%),
      repeating-linear-gradient(140deg, rgba(43, 29, 20, 0.85) 0px, rgba(43, 29, 20, 0.85) 8px, rgba(23, 14, 10, 0.95) 8px, rgba(23, 14, 10, 0.95) 20px)
    `,
    backgroundSize: "cover",
  };

  return (
    <div className="min-h-screen p-4 sm:p-8 flex items-center justify-center font-['Merriweather']" style={salmonBackground}>
      <div className="w-full max-w-5xl bg-white shadow-xl overflow-hidden border-t-8 border-[#FE5000]">
        <div className="p-6 lg:p-8 bg-[#425563] text-white flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <img src="/aquachile_logo.png" alt="AquaChile Logo" className="h-8 object-contain" />
            <div className="h-8 w-px bg-white/30 mx-2" />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#D7D2CB] font-['Quicksand']">Customer Name</div>
              <h1 className="text-xl font-bold font-['Quicksand']">{(inventoryRow.clientePrincipal || "").toUpperCase()}</h1>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-widest text-[#D7D2CB] font-['Quicksand']">Current Status</span>
            <div className="mt-1">
              <Badge text={inventoryRow.status} />
            </div>
          </div>
        </div>

        <div className="p-6 lg:p-12">
          <div className="relative mb-8 pt-4 px-4">
            <div className="absolute top-7 left-0 w-full h-0.5 bg-[#D7D2CB]" />
            <div
              className="absolute top-7 left-0 h-0.5 bg-[#FE5000] transition-all duration-1000 ease-out"
              style={{ width: `${(currentStatusIdx / (TRACK_STEPS.length - 1)) * 100}%` }}
            />
            <div className="flex justify-between items-start relative">
              {TRACK_STEPS.map((step, idx) => (
                <div key={step.id} className="flex flex-col items-center w-32">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-colors duration-500 ${
                      idx <= currentStatusIdx ? "bg-[#FE5000] text-white" : "bg-[#F9F8F6] border-2 border-[#D7D2CB] text-[#D7D2CB]"
                    }`}
                  >
                    {idx <= currentStatusIdx ? "✓" : idx + 1}
                  </div>
                  <span
                    className={`text-[10px] mt-3 text-center font-['Quicksand'] font-bold uppercase tracking-wider ${
                      idx <= currentStatusIdx ? "text-[#425563]" : "text-[#D7D2CB]"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-[#D7D2CB] bg-white shadow-sm p-6">
              <h3 className="text-xs sm:text-sm font-bold uppercase font-['Quicksand'] text-[#1f2a37] tracking-wide mb-4">Order Overview</h3>
              <dl className="space-y-3 text-sm text-[#253540]">
                {orderSummary.map(item => (
                  <div key={item.label} className="flex justify-between items-center gap-4 pb-2 border-b border-[#EEF2F6] last:border-0 last:pb-0">
                    <dt className="font-bold uppercase tracking-wider text-[#6E7785] text-[11px]">{item.label}</dt>
                    <dd className="text-right font-semibold text-[#101828]">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="border border-[#D7D2CB] bg-white shadow-sm p-6">
              <h3 className="text-xs sm:text-sm font-bold uppercase font-['Quicksand'] text-[#1f2a37] tracking-wide mb-4">Allocation Overview</h3>
              <dl className="space-y-3 text-sm text-[#253540]">
                {allocationSummary.map(item => (
                  <div key={item.label} className="flex justify-between items-center gap-4 pb-2 border-b border-[#EEF2F6] last:border-0 last:pb-0">
                    <dt className="font-bold uppercase tracking-wider text-[#6E7785] text-[11px]">{item.label}</dt>
                    <dd className="text-right font-semibold text-[#101828]">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <div className="mt-10">
            <h3 className="text-sm font-bold text-[#425563] font-['Quicksand'] uppercase border-b border-[#FE5000] pb-2 inline-block mb-4">
              Allocated Cases Detail
            </h3>
            <div className="overflow-x-auto border border-[#D7D2CB]">
              <table className="w-full text-xs text-[#6E6259]">
                <thead className="bg-[#F0EFE9] font-['Quicksand'] font-bold text-[#425563]">
                  <tr className="text-left">
                    <th className="py-3 px-4">PO</th>
                    <th className="px-4">Prod. Date</th>
                    <th className="px-4">Specification</th>
                    <th className="px-4 text-right">Cases</th>
                    <th className="px-4 text-right">Lb</th>
                    <th className="px-4">ID</th>
                    <th className="px-4">Request ETA</th>
                    <th className="px-4">AWB</th>
                    <th className="px-4">Location</th>
                    <th className="px-4">Sales Order</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedItemDetails.map(detail => (
                    <tr key={`${detail.allocationId}-${detail.po}-${detail.id}`} className="border-b border-[#F0EFE9] last:border-0">
                      <td className="py-3 px-4 font-bold text-[#425563]">{detail.po}</td>
                      <td className="px-4">{detail.productionDate}</td>
                      <td className="px-4 truncate" title={detail.specification}>
                        {detail.specification}
                      </td>
                      <td className="px-4 text-right font-bold">{detail.cases.toLocaleString()}</td>
                      <td className="px-4 text-right font-bold">{detail.lbs.toLocaleString()}</td>
                      <td className="px-4">{detail.id}</td>
                      <td className="px-4">{detail.requestEta}</td>
                      <td className="px-4">{detail.awb}</td>
                      <td className="px-4">{detail.location}</td>
                      <td className="px-4">{detail.salesOrder}</td>
                    </tr>
                  ))}
                  {assignedItemDetails.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center text-[#D7D2CB] py-4 italic">
                        No cases allocated from this lot yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <table className="text-xs font-['Quicksand'] uppercase tracking-wider border border-[#D7D2CB] bg-white shadow-sm">
                <tbody>
                  <tr>
                    <td className="px-4 py-2 text-[#6E6259] font-bold border-b border-[#D7D2CB]">Total Cases Allocated</td>
                    <td className="px-4 py-2 text-[#1F2A37] font-extrabold border-b border-[#D7D2CB]">{totalCasesAssigned.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-[#6E6259] font-bold">Total Pounds Allocated</td>
                    <td className="px-4 py-2 text-[#1F2A37] font-extrabold">{totalLbsAssigned.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-10">
            <h3 className="text-sm font-bold text-[#425563] font-['Quicksand'] uppercase border-b border-[#FE5000] pb-2 inline-block mb-4">History</h3>
            <ul className="space-y-3 text-xs text-[#6E6259]">
              {inventoryRow.statusHistory
                .slice()
                .reverse()
                .map((h, i) => (
                  <li key={i} className="flex items-center gap-4 pb-2 border-b border-[#F0EFE9] last:border-0">
                    <span className="font-bold text-[#425563] w-44">{formatDateTime(h.at)}</span>
                    <Badge text={h.status} />
                  </li>
                ))}
            </ul>
          </div>

          <div className="mt-10 border border-[#D7D2CB] bg-[#F9F8F6] p-6 text-xs text-[#6E6259]">
            <h3 className="text-sm font-bold text-[#425563] font-['Quicksand'] uppercase mb-3">Need help with this shipment?</h3>
            <p>If you notice any inconsistency, please contact your AquaChile sales agent directly so we can review the allocation details with you.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CombinedTrackingView({ entry, rows, assignments, salesOrders }: { entry: CombinedTrackingLink; rows: InventoryRow[]; assignments: Assignment[]; salesOrders: SalesOrder[] }) {
  const salmonBackground = {
    backgroundColor: "#1a1410",
    backgroundImage: `
      radial-gradient(circle at 30% 35%, rgba(255, 131, 92, 0.75) 0%, rgba(255, 131, 92, 0.15) 28%, transparent 52%),
      radial-gradient(circle at 70% 40%, rgba(255, 104, 60, 0.65) 0%, rgba(255, 104, 60, 0.1) 26%, transparent 55%),
      radial-gradient(circle at 25% 70%, rgba(255, 187, 146, 0.35) 0%, rgba(255, 187, 146, 0.05) 28%, transparent 60%),
      radial-gradient(circle at 65% 75%, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.02) 25%, transparent 55%),
      linear-gradient(160deg, rgba(26, 18, 12, 0.95) 0%, rgba(51, 34, 23, 0.95) 45%, rgba(26, 18, 12, 0.92) 100%),
      repeating-linear-gradient(140deg, rgba(43, 29, 20, 0.85) 0px, rgba(43, 29, 20, 0.85) 8px, rgba(23, 14, 10, 0.95) 8px, rgba(23, 14, 10, 0.95) 20px)
    `,
    backgroundSize: "cover",
  };

  const summary = rows.reduce(
    (acc, row) => {
      acc.cases += row.cajasInv;
      acc.lbs += row.cajasInv * row.formatoCaja;
      return acc;
    },
    { cases: 0, lbs: 0 }
  );

  const perRowData = rows.map(row => {
    const rowAssignments = assignments
      .map(asg => {
        const matchedItems = getAssignmentItems(asg).filter(item => item.inventoryId === row.id);
        if (!matchedItems.length) return null;
        return { assignment: asg, items: matchedItems };
      })
      .filter((entry): entry is { assignment: Assignment; items: OrderItem[] } => Boolean(entry));
    const rowCasesAssigned = rowAssignments.reduce((sum, entry) => sum + entry.items.reduce((s, item) => s + item.cajas, 0), 0);
    const relatedSalesOrder = salesOrders.find(so => so.customerPO === row.customerPO);
    return { row, rowAssignments, rowCasesAssigned, relatedSalesOrder };
  });

  return (
    <div className="min-h-screen p-4 sm:p-8 flex items-center justify-center font-['Merriweather']" style={salmonBackground}>
      <div className="w-full max-w-6xl bg-white shadow-xl overflow-hidden border-t-8 border-[#FE5000]">
        <div className="p-6 lg:p-8 bg-[#425563] text-white flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <img src="/aquachile_logo.png" alt="AquaChile Logo" className="h-8 object-contain" />
            <div className="h-8 w-px bg-white/30 mx-2"></div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#D7D2CB] font-['Quicksand']">Customer Name</div>
              <h1 className="text-xl font-bold font-['Quicksand']">{entry.cliente.toUpperCase()}</h1>
              <p className="text-xs text-[#D7D2CB] mt-1 tracking-wide">Combined Tracking · {rows.length} lots</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-widest text-[#D7D2CB] font-['Quicksand']">Link Created</span>
            <div className="text-sm font-semibold">{new Date(entry.createdAt).toLocaleString()}</div>
          </div>
        </div>
        <div className="p-6 lg:p-10 space-y-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-center">
            <div className="bg-[#F9F8F6] border border-[#D7D2CB] p-4">
              <div className="text-xs font-['Quicksand'] font-bold text-[#6E6259] uppercase tracking-wider">Lots Included</div>
              <div className="text-3xl font-['Merriweather'] text-[#425563] mt-1">{rows.length}</div>
            </div>
            <div className="bg-[#F9F8F6] border border-[#D7D2CB] p-4">
              <div className="text-xs font-['Quicksand'] font-bold text-[#6E6259] uppercase tracking-wider">Total Cases</div>
              <div className="text-3xl font-['Merriweather'] text-[#425563] mt-1">{summary.cases.toLocaleString()}</div>
            </div>
            <div className="bg-[#F9F8F6] border border-[#D7D2CB] p-4">
              <div className="text-xs font-['Quicksand'] font-bold text-[#6E6259] uppercase tracking-wider">Total Pounds</div>
              <div className="text-3xl font-['Merriweather'] text-[#425563] mt-1">{summary.lbs.toLocaleString()}</div>
            </div>
          </div>
          <div className="space-y-6">
            {perRowData.map(({ row, rowAssignments, rowCasesAssigned, relatedSalesOrder }) => (
              <div key={row.id} className="border border-[#D7D2CB]">
                <div className="p-4 flex flex-wrap items-center justify-between gap-4 bg-[#F9F8F6] border-b border-[#E8E4DE]">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-[#6E6259] font-['Quicksand']">AquaChile Lot</div>
                    <div className="text-lg font-bold text-[#425563]">{row.po}</div>
                    <div className="text-xs text-[#6E6259]">Customer PO: {row.customerPO || "—"}</div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] uppercase tracking-widest text-[#6E6259] font-['Quicksand']">Current Status</span>
                    <div className="mt-1"><Badge text={row.status} /></div>
                  </div>
                </div>
                <div className="p-4 grid sm:grid-cols-2 gap-4 text-xs text-[#425563]">
                  <div>
                    <div className="font-bold uppercase text-[#6E6259]">Location</div>
                    <div>{row.bodega} · {row.ubicacion}</div>
                  </div>
                  <div>
                    <div className="font-bold uppercase text-[#6E6259]">ETA</div>
                    <div className="text-[#FE5000] font-semibold">{row.eta}</div>
                  </div>
                  <div>
                    <div className="font-bold uppercase text-[#6E6259]">Cases Available</div>
                    <div className="font-bold text-lg">{row.cajasInv.toLocaleString()}</div>
                    <div className="text-[10px] text-[#6E6259]">{(row.cajasInv * row.formatoCaja).toLocaleString()} lbs</div>
                  </div>
                  <div>
                    <div className="font-bold uppercase text-[#6E6259]">Sales Order</div>
                    <div>{relatedSalesOrder?.demandId || "—"}</div>
                  </div>
                </div>
                <div className="p-4 border-t border-[#E8E4DE]">
                  <h4 className="text-sm font-bold uppercase font-['Quicksand'] text-[#425563] mb-3">Allocations</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-[#6E6259]">
                      <thead className="table-header">
                        <tr>
                          <th className="py-2 px-3 text-left">Assignment</th>
                          <th className="px-3 text-left">Date</th>
                          <th className="px-3 text-left">Type</th>
                          <th className="px-3 text-right">Cases</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rowAssignments.map(({ assignment, items }) => {
                          const cases = items.reduce((sum, item) => sum + item.cajas, 0);
                          return (
                            <tr key={`${assignment.id}-${row.id}`} className="border-b border-[#F0EFE9]">
                              <td className="py-2 px-3 font-bold text-[#425563]">{assignment.id}</td>
                              <td className="px-3">{assignment.fecha}</td>
                              <td className="px-3"><Badge text={assignment.tipo} /></td>
                              <td className="px-3 text-right font-bold">{cases.toLocaleString()}</td>
                            </tr>
                          );
                        })}
                        {rowAssignments.length === 0 && (
                          <tr>
                            <td colSpan={4} className="text-center text-[#B4AAA1] italic py-3">No hay asignaciones para este lote.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 text-right text-[11px] uppercase text-[#425563] font-['Quicksand']">
                    Total asignado: <strong>{rowCasesAssigned.toLocaleString()}</strong> cases
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
