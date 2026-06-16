"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Package } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { StaffHeader } from "@/components/layout/staff-header";
import { Badge } from "@/components/ui/badge";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listInventory, type InventoryItem } from "@/lib/api";
import { ModuleGate } from "@/components/settings/module-gate";

function InventoryContent() {
  const { getIdToken, profile } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.type !== "staff") return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const token = await getIdToken();
        if (!token) throw new Error("Not signed in");

        const { items: inventoryItems } = await listInventory(token);
        if (!cancelled) setItems(inventoryItems);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load inventory");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [getIdToken, profile]);

  const lowStock = useMemo(
    () => items.filter((item) => item.onHand <= item.reorderAt),
    [items]
  );

  return (
    <>
      <StaffHeader
        title="Inventory"
        description="Track stock levels and purchasing needs"
        action={<Button disabled>Create Purchase Order</Button>}
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
        {error && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {loading ? (
          <AppLoadingScreen label="Loading inventory…" />
        ) : (
          <>
            {lowStock.length > 0 && (
              <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
                <CardContent className="flex items-start gap-3 p-6">
                  <AlertTriangle className="size-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-amber-900">
                      {lowStock.length} items below reorder point
                    </p>
                    <p className="text-sm text-amber-800/80">
                      Review stock levels and create purchase orders before running
                      out.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="size-4" />
                  Stock Levels
                </CardTitle>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No inventory items yet. Add stock through your shop setup or
                    backend seed.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Warehouse</TableHead>
                        <TableHead className="text-right">On Hand</TableHead>
                        <TableHead className="text-right">Reorder At</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => {
                        const isLow = item.onHand <= item.reorderAt;
                        return (
                          <TableRow key={item.id ?? item.sku}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {item.sku}
                            </TableCell>
                            <TableCell>{item.warehouse}</TableCell>
                            <TableCell className="text-right">{item.onHand}</TableCell>
                            <TableCell className="text-right">
                              {item.reorderAt}
                            </TableCell>
                            <TableCell>
                              {isLow ? (
                                <Badge
                                  variant="outline"
                                  className="border-amber-200 bg-amber-50 text-amber-700"
                                >
                                  Low stock
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="border-emerald-200 bg-emerald-50 text-emerald-700"
                                >
                                  OK
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </>
  );
}

export default function InventoryPage() {
  return (
    <ModuleGate moduleKey="inventory">
      <InventoryContent />
    </ModuleGate>
  );
}
