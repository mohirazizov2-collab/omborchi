"use client";

import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRightLeft, Plus, Trash2, Calendar, MapPin } from "lucide-react";
import { useState } from "react";

export default function TransfersPage() {
  const [items, setItems] = useState([{ id: 1, product: "", quantity: 0 }]);

  const addItem = () => {
    setItems([...items, { id: Date.now(), product: "", quantity: 0 }]);
  };

  const removeItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  return (
    <div className="flex min-h-screen">
      <OmniSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold font-headline tracking-tight text-primary">Inter-Warehouse Transfers</h1>
          <p className="text-muted-foreground mt-1">Move stock between your distribution centers and hubs.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="font-headline">Route Details</CardTitle>
                <CardDescription>Select source and destination warehouses.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="source">Source Warehouse</Label>
                  <Select>
                    <SelectTrigger id="source">
                      <SelectValue placeholder="From..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="main">Main Hub - Tashkent</SelectItem>
                      <SelectItem value="fergana">Fergana Regional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination Warehouse</Label>
                  <Select>
                    <SelectTrigger id="destination">
                      <SelectValue placeholder="To..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="samarkand">Samarkand Hub</SelectItem>
                      <SelectItem value="bukhara">Bukhara Distribution</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transfer_date">Scheduled Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input id="transfer_date" type="date" className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ref">Reference #</Label>
                  <Input id="ref" placeholder="TRF-001122" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-headline">Items to Transfer</CardTitle>
                  <CardDescription>Specify products and quantities.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={addItem} className="gap-2">
                  <Plus className="w-4 h-4" /> Add Item
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 items-end p-4 rounded-lg bg-accent/20 border">
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs">Product</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Search product..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="i9">Intel Core i9-13900K</SelectItem>
                          <SelectItem value="rtx4090">NVIDIA RTX 4090 FE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-32 space-y-2">
                      <Label className="text-xs">Quantity</Label>
                      <Input type="number" placeholder="0" />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-none shadow-sm h-fit sticky top-8">
              <CardHeader>
                <CardTitle className="font-headline">Transfer Summary</CardTitle>
                <CardDescription>Confirm logistics requirements.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total SKUs</span>
                  <span className="font-semibold">{items.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Distance (Est.)</span>
                  <span className="font-semibold">320 km</span>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground italic">Note: Inventory will be marked as "In Transit" until received at the destination warehouse.</p>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button className="w-full h-11 text-lg gap-2">
                  <ArrowRightLeft className="w-5 h-5" /> Initiate Transfer
                </Button>
                <Button variant="outline" className="w-full">Save as Draft</Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}