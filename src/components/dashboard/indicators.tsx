import type { ComponentType, ReactNode } from "react";
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconCreditCard,
  IconLandmark,
  IconShield,
  IconTrendingUp,
  IconWallet,
  type IconProps,
} from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MoneyValue } from "@/components/ui/money-value";
import { getDictionary } from "@/lib/i18n";
import { formatMoney, type MinorUnits } from "@/lib/money";
import type { DashboardData, IndicatorId } from "@/lib/dashboard";

interface IndicatorProps {
  data: DashboardData;
}

interface CardDef {
  id: IndicatorId;
  icon: ComponentType<IconProps>;
  render: (props: IndicatorProps) => ReactNode;
}

function IndicatorCard({
  id,
  icon: Icon,
  label,
  estimated,
  children,
}: {
  id: IndicatorId;
  icon: ComponentType<IconProps>;
  label: string;
  estimated?: boolean;
  children: ReactNode;
}) {
  const dict = getDictionary();
  return (
    <Card className="flex flex-col gap-2.5 p-4" data-indicator={id}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-bold text-muted">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary-soft text-primary-700">
            <Icon size={14} />
          </span>
          {label}
        </span>
        {typeof estimated === "boolean" ? (
          <Badge tone={estimated ? "neutral" : "primary"}>
            {estimated ? dict.dashboard.estimatedBadge : dict.dashboard.realBadge}
          </Badge>
        ) : null}
      </div>
      {children}
    </Card>
  );
}

export function IndicatorGrid({ data }: { data: DashboardData }) {
  const dict = getDictionary();
  const currency = data.currency;

  const definitions: CardDef[] = [
    {
      id: "ingresos",
      icon: IconArrowUpRight,
      render: () => (
        <IndicatorCard
          id="ingresos"
          icon={IconArrowUpRight}
          label={dict.dashboard.indicators.ingresos}
          estimated={data.incomeMonth.estimated}
        >
          <MoneyValue amount={data.incomeMonth.amount} kind="income" size="lg" />
        </IndicatorCard>
      ),
    },
    {
      id: "gastos",
      icon: IconArrowDownRight,
      render: () => (
        <IndicatorCard
          id="gastos"
          icon={IconArrowDownRight}
          label={dict.dashboard.indicators.gastos}
          estimated={data.expensesMonth.estimated}
        >
          <MoneyValue amount={data.expensesMonth.amount} kind="expense" size="lg" />
        </IndicatorCard>
      ),
    },
    {
      id: "saldo",
      icon: IconWallet,
      render: () => (
        <IndicatorCard id="saldo" icon={IconWallet} label={dict.dashboard.indicators.saldo}>
          <MoneyValue
            amount={data.balance}
            kind={data.balance < 0 ? "expense" : "income"}
            size="lg"
          />
        </IndicatorCard>
      ),
    },
    {
      id: "ahorro",
      icon: IconTrendingUp,
      render: () => (
        <IndicatorCard id="ahorro" icon={IconTrendingUp} label={dict.dashboard.indicators.ahorro} estimated>
          <MoneyValue amount={data.savingsInvestment} kind="investment" size="lg" />
        </IndicatorCard>
      ),
    },
    {
      id: "deudas",
      icon: IconCreditCard,
      render: () => (
        <IndicatorCard id="deudas" icon={IconCreditCard} label={dict.dashboard.indicators.deudas} estimated>
          {data.debtsTotal.hasDebts ? (
            <MoneyValue amount={data.debtsTotal.amount} kind="debt" size="lg" />
          ) : (
            <p className="font-display text-lg font-semibold text-success">—</p>
          )}
        </IndicatorCard>
      ),
    },
    {
      id: "fondo",
      icon: IconShield,
      render: () => {
        const percent =
          data.emergencyFund.target > 0
            ? Math.min(100, Math.round((data.emergencyFund.current / data.emergencyFund.target) * 100))
            : 0;
        return (
          <IndicatorCard id="fondo" icon={IconShield} label={dict.dashboard.indicators.fondo} estimated>
            <MoneyValue amount={data.emergencyFund.current} kind="goal" size="lg" />
            <div className="mt-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary-50 ring-1 ring-inset ring-border/60">
                <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-1 text-[11px] tabular-nums text-faint">
                {percent}% · {formatMoney(data.emergencyFund.target, { currency })}
              </p>
            </div>
          </IndicatorCard>
        );
      },
    },
    {
      id: "patrimonio",
      icon: IconLandmark,
      render: () => (
        <IndicatorCard
          id="patrimonio"
          icon={IconLandmark}
          label={dict.dashboard.indicators.patrimonio}
          estimated={data.netWorth.estimated}
        >
          <MoneyValue amount={data.netWorth.amount} kind="equity" size="lg" />
        </IndicatorCard>
      ),
    },
  ];

  const visible = definitions.filter((definition) => data.visibleIndicators.includes(definition.id));

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {visible.map((definition) => (
        <div key={definition.id}>{definition.render({ data })}</div>
      ))}
    </div>
  );
}
