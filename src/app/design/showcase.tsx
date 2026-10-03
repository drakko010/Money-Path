"use client";

import { useState } from "react";
import {
  IconCalendar,
  IconChart,
  IconDots,
  IconDownload,
  IconPencil,
  IconPlus,
  IconRoute,
  IconSearch,
  IconSparkles,
  IconTrash,
  IconWallet,
} from "@/components/icons";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Drawer } from "@/components/ui/drawer";
import { Dropdown } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { LoadingState, Skeleton } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsPanel, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";

function Demo({
  title,
  description,
  children,
  id,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <Card id={id}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  );
}

export function Showcase() {
  const { toast } = useToast();

  // Estados de demonstração.
  const [tab, setTab] = useState("resumen");
  const [sliderValue, setSliderValue] = useState(62);
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [alertsVisible, setAlertsVisible] = useState(true);
  const [name, setName] = useState("");
  const [switchOn, setSwitchOn] = useState(true);
  const [checked, setChecked] = useState(false);

  function handleConfirm() {
    setConfirmLoading(true);
    window.setTimeout(() => {
      setConfirmLoading(false);
      setConfirmOpen(false);
      toast({
        title: "Categoría eliminada",
        description: "La operación de demostración se completó correctamente.",
        variant: "success",
      });
    }, 1200);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ── Botones ─────────────────────────────────────────────────── */}
      <Demo
        title="Button"
        description="Variantes primary, secondary, soft, ghost y danger · tamaños sm/md/lg."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button>Crear plan</Button>
          <Button variant="secondary">Cancelar</Button>
          <Button variant="soft">Ver detalle</Button>
          <Button variant="ghost">Omitir</Button>
          <Button variant="danger">Eliminar</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" iconLeft={<IconPlus size={14} />}>
            Agregar
          </Button>
          <Button size="md" iconLeft={<IconWallet size={15} />} iconRight={<IconRoute size={15} />}>
            Mi ruta
          </Button>
          <Button size="lg">Empezar ahora</Button>
          <Button disabled>Deshabilitado</Button>
          <Button loading>Cargando…</Button>
        </div>
      </Demo>

      {/* ── Input / Select ──────────────────────────────────────────── */}
      <Demo
        title="Input y Select"
        description="Rótulo, dica, error y adornos. Select nativo estilizado."
      >
        <Input
          label="Tu nombre"
          placeholder="¿Cómo te llamas?"
          value={name}
          onChange={(event) => setName(event.target.value)}
          hint="Se usará para personalizar tu plan."
        />
        <Input
          label="Monto mensual"
          placeholder="0.00"
          inputMode="decimal"
          iconLeft={<IconSearch size={15} />}
          error="Ingresa un monto válido, por ejemplo: 2,500.00"
        />
        <Select label="Moneda base" defaultValue="MXN" hint="Preparado para múltiples monedas.">
          <option value="MXN">MXN — Peso mexicano</option>
          <option value="USD">USD — Dólar (próximamente)</option>
          <option value="COP">COP — Peso colombiano (próximamente)</option>
        </Select>
      </Demo>

      {/* ── Checkbox / Switch / Slider ─────────────────────────────── */}
      <Demo
        title="Checkbox, Switch y Slider"
        description="Controles de selección y rango."
      >
        <Checkbox
          label="Aportación automática"
          description="Redondear cada compra y apartar la diferencia."
          checked={checked}
          onCheckedChange={setChecked}
        />
        <div className="h-px bg-border/70" />
        <Switch
          label="Notificaciones semanales"
          description="Resumen de tu avance cada lunes."
          checked={switchOn}
          onCheckedChange={setSwitchOn}
        />
        <div className="h-px bg-border/70" />
        <Slider
          label="Porcentaje de ahorro sugerido"
          value={sliderValue}
          onValueChange={setSliderValue}
          min={0}
          max={100}
          step={1}
          showValue
          formatValue={(value) => `${value}%`}
        />
        <Progress value={sliderValue} label="Avance de tu meta" showValue />
      </Demo>

      {/* ── Badges / Progress ──────────────────────────────────────── */}
      <Demo title="Badge y Progress" description="Etiquetas de estado y barras de avance.">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="success" dot>
            Al día
          </Badge>
          <Badge tone="warning" dot>
            Atención
          </Badge>
          <Badge tone="danger" dot>
            Vencida
          </Badge>
          <Badge tone="info">Recurrente</Badge>
          <Badge tone="primary">Meta</Badge>
          <Badge tone="accent">Inversión</Badge>
          <Badge tone="outline">Planificado</Badge>
        </div>
        <Progress value={82} tone="primary" label="Fondo de emergencia" showValue />
        <Progress value={45} tone="success" label="Meta: viaje" showValue size="sm" />
        <Progress value={28} tone="accent" label="Inversiones" showValue />
      </Demo>

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <Demo title="Tabs" description="Navegación por pestañas con teclado (← →).">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
            <TabsTrigger value="metas">Metas</TabsTrigger>
          </TabsList>
          <TabsPanel value="resumen">
            <p className="text-sm leading-relaxed text-muted">
              Contenido del resumen: situación general, balance y siguiente paso sugerido.
            </p>
          </TabsPanel>
          <TabsPanel value="movimientos">
            <p className="text-sm leading-relaxed text-muted">
              Contenido de movimientos: lista de ingresos y gastos con categorías.
            </p>
          </TabsPanel>
          <TabsPanel value="metas">
            <p className="text-sm leading-relaxed text-muted">
              Contenido de metas: avance por objetivo con barras de progreso.
            </p>
          </TabsPanel>
        </Tabs>
      </Demo>

      {/* ── Alert ──────────────────────────────────────────────────── */}
      <Demo title="Alert" description="Mensajes contextuales embebidos en la página.">
        {alertsVisible ? (
          <div className="flex flex-col gap-3">
            <Alert
              variant="info"
              title="Nuevo dato disponible"
              description="Tu resumen mensual ya está listo para revisar."
            />
            <Alert
              variant="success"
              title="Meta alcanzada"
              description="Completaste tu fondo de emergencia antes de lo previsto."
            />
            <Alert
              variant="warning"
              title="Suscripción por renovarse"
              description="Tu plan de streaming se cobra en 3 días."
            />
            <Alert
              variant="danger"
              title="Pago vencido"
              description="La mensualidad de tu tarjeta venció ayer."
              onClose={() => setAlertsVisible(false)}
            />
          </div>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => setAlertsVisible(true)}>
            Mostrar alertas de nuevo
          </Button>
        )}
      </Demo>

      {/* ── Toast ──────────────────────────────────────────────────── */}
      <Demo
        title="Toast"
        description="Notificaciones transitorias (auto-cierre en 4.5s).Viewport abajo a la derecha; ancho completo en móvil."
      >
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => toast({ title: "Movimiento guardado", variant: "success" })}
          >
            Success
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              toast({
                title: "No se pudo sincronizar",
                description: "Revisa tu conexión e intenta de nuevo.",
                variant: "danger",
              })
            }
          >
            Danger
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              toast({ title: "Presupuesto al 85%", variant: "warning" })
            }
          >
            Warning
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              toast({
                title: "Consejo de Money AI",
                description: "Apartar el ahorro el día de cobro aumenta tu constancia.",
                variant: "info",
              })
            }
          >
            Info
          </Button>
        </div>
      </Demo>

      {/* ── Modal / Drawer / Dropdown / Tooltip / Confirm ──────────── */}
      <Demo
        title="Modal, Drawer, Dropdown, Tooltip y Confirmación"
        description="Capas superpuestas con Escape, clic fuera y foco controlado."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setModalOpen(true)}>Abrir modal</Button>
          <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
            Abrir drawer
          </Button>
          <Dropdown
            trigger={
              <Button variant="secondary" iconRight={<IconDots size={15} />}>
                Acciones
              </Button>
            }
            items={[
              { label: "Editar", icon: <IconPencil size={15} /> },
              { label: "Duplicar", icon: <IconDownload size={15} /> },
              {
                label: "Ver historial",
                icon: <IconCalendar size={15} />,
                separatorBefore: true,
              },
              {
                label: "Eliminar",
                icon: <IconTrash size={15} />,
                danger: true,
                separatorBefore: true,
                onSelect: () => setConfirmOpen(true),
              },
            ]}
          />
          <Tooltip content="Proyección calculada con tus datos reales">
            <Button variant="ghost" iconLeft={<IconSparkles size={15} />}>
              Pasa el cursor
            </Button>
          </Tooltip>
        </div>
        <p className="text-xs text-faint">
          El menú “Eliminar” del dropdown abre el diálogo de confirmación con estado de carga.
        </p>
      </Demo>

      {/* ── Estados: vacío / cargando / error ──────────────────────── */}
      <Demo
        title="Empty, Loading y Error states"
        description="Toda área de datos debe contemplar estos estados."
      >
        <EmptyState
          icon={<IconChart size={20} />}
          title="Aún no tienes movimientos"
          description="Registra tu primer ingreso o gasto para empezar a ver tu ruta."
          action={
            <Button size="sm" iconLeft={<IconPlus size={14} />}>
              Registrar movimiento
            </Button>
          }
        />
        <LoadingState label="Calculando tu patrimonio…" />
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-10 w-full" />
        </div>
        <ErrorState
          onRetry={() =>
            toast({ title: "Reintentando…", description: "Consulta relanzada.", variant: "info" })
          }
        />
      </Demo>

      {/* ── Card completo de referência ────────────────────────────── */}
      <Demo title="Card compuesto" description="Header, contenido, footer y variante elevada.">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Fondo de emergencia</CardTitle>
            <CardDescription>Meta: 6 meses de gastos fijos</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={68} tone="success" showValue label="Avance" />
          </CardContent>
          <CardFooter className="flex items-center justify-between">
            <Badge tone="success" dot>
              En buen camino
            </Badge>
            <Button size="sm" variant="soft">
              Ajustar meta
            </Button>
          </CardFooter>
        </Card>
      </Demo>

      {/* ── Overlays ───────────────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Nueva meta"
        description="Define el objetivo y el plazo de tu meta."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setModalOpen(false);
                toast({ title: "Meta creada", variant: "success" });
              }}
            >
              Crear meta
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input label="Nombre de la meta" placeholder="Ej. Viaje a Oaxaca" />
          <Input label="Monto objetivo" placeholder="15,000.00" inputMode="decimal" />
          <Select label="Horizonte" defaultValue="12">
            <option value="3">3 meses</option>
            <option value="6">6 meses</option>
            <option value="12">12 meses</option>
          </Select>
        </div>
      </Modal>

      <Drawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="Detalle de movimiento"
        description="Lateral en desktop · bottom-sheet en móvil"
        footer={
          <Button
            onClick={() => {
              setDrawerOpen(false);
              toast({ title: "Cambios guardados", variant: "success" });
            }}
          >
            Guardar
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <Select label="Categoría" defaultValue="transporte">
            <option value="transporte">Transporte</option>
            <option value="comida">Comida</option>
            <option value="hogar">Hogar</option>
          </Select>
          <Input label="Nota" placeholder="Opcional" />
          <Switch
            label="Marcar como fijo"
            description="Se repetirá cada mes automáticamente."
          />
        </div>
      </Drawer>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="¿Eliminar categoría?"
        description="Los movimientos asociados quedarán sin categoría. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Conservar"
        tone="danger"
        loading={confirmLoading}
        onConfirm={handleConfirm}
        icon={<IconTrash size={18} />}
      />
    </div>
  );
}
