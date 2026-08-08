import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveAddress, type Address } from "@/lib/account.functions";

type AddressInput = {
  id?: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
};

export function AddressDialog({
  open,
  onOpenChange,
  address,
  title = "Add a delivery address",
  description = "We keep this on your account so checkout stays one tap next time.",
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  address?: Address | null;
  title?: string;
  description?: string;
  onSaved?: (addresses: Address[]) => void;
}) {
  const qc = useQueryClient();
  const [pincode, setPincode] = useState(address?.pincode ?? "");
  const [phone, setPhone] = useState(address?.phone ?? "");

  const save = useMutation({
    mutationFn: (values: AddressInput) => saveAddress({ data: values }),
    onSuccess: async (addresses) => {
      await qc.invalidateQueries({ queryKey: ["addresses"] });
      toast.success("Address saved");
      onSaved?.(addresses);
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            save.mutate({
              ...(address?.id ? { id: address.id } : {}),
              label: String(f.get("label") || "Home"),
              fullName: String(f.get("fullName")),
              phone,
              line1: String(f.get("line1")),
              line2: String(f.get("line2") ?? ""),
              city: String(f.get("city")),
              state: String(f.get("state")),
              pincode,
              country: "India",
              isDefault: true,
            });
          }}
        >
          <div className="sm:col-span-1">
            <Label htmlFor="a-name">Full name</Label>
            <Input id="a-name" name="fullName" defaultValue={address?.fullName} required />
          </div>
          <div>
            <Label htmlFor="a-phone">Mobile</Label>
            <Input
              id="a-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              inputMode="numeric"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="a-line1">House / flat, street</Label>
            <Input id="a-line1" name="line1" defaultValue={address?.line1} required />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="a-line2">Area, landmark (optional)</Label>
            <Input id="a-line2" name="line2" defaultValue={address?.line2} />
          </div>
          <div>
            <Label htmlFor="a-city">City</Label>
            <Input id="a-city" name="city" defaultValue={address?.city} required />
          </div>
          <div>
            <Label htmlFor="a-state">State</Label>
            <Input id="a-state" name="state" defaultValue={address?.state} required />
          </div>
          <div>
            <Label htmlFor="a-pin">PIN code</Label>
            <Input
              id="a-pin"
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              required
            />
          </div>
          <div>
            <Label htmlFor="a-label">Label</Label>
            <Input id="a-label" name="label" defaultValue={address?.label ?? "Home"} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" className="w-full rounded-full" disabled={save.isPending}>
              {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />} Save address
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
