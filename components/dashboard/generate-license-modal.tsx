"use client";

import { useCallback, useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useClientOptionsQuery } from "@/lib/hooks/use-clients";
import { useActiveModulesQuery } from "@/lib/hooks/use-modules";
import { useActivePartnersQuery } from "@/lib/hooks/use-partners";
import { useInstallationsQuery } from "@/lib/hooks/use-installations";
import {
  useCreateClientMutation,
  useCreateInstallationMutation,
  useGenerateLicenseMutation,
} from "@/lib/hooks/use-dashboard-mutations";

const NONE_PARTNER_VALUE = "__none__";

const DURATION_PRESETS = [
  { label: "1 Month", days: 30 },
  { label: "3 Months", days: 90 },
  { label: "6 Months", days: 180 },
  { label: "1 Year", days: 365 },
] as const;

export function GenerateLicenseModal() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [clientId, setClientId] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("");
  const [alliancePartnerId, setAlliancePartnerId] = useState("");
  const [softwareModuleId, setSoftwareModuleId] = useState("");
  const [installationId, setInstallationId] = useState("");
  const [installationMode, setInstallationMode] = useState<"existing" | "new">("existing");
  const [newInstallationIdentifier, setNewInstallationIdentifier] = useState("");
  const [newInstallationHostname, setNewInstallationHostname] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [commissionRate, setCommissionRate] = useState("20");
  const [durationInDays, setDurationInDays] = useState("365");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(365);
  const [generatedToken, setGeneratedToken] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: clients = [], isLoading: clientsLoading } =
    useClientOptionsQuery(open);
  const { data: modules = [], isLoading: modulesLoading } =
    useActiveModulesQuery(open);
  const { data: partners = [], isLoading: partnersLoading } =
    useActivePartnersQuery(open);
  const { data: installations = [], isLoading: installationsLoading } =
    useInstallationsQuery(clientId || undefined);

  const createClientMutation = useCreateClientMutation();
  const createInstallationMutation = useCreateInstallationMutation();
  const generateLicenseMutation = useGenerateLicenseMutation();

  const isPending =
    createClientMutation.isPending ||
    createInstallationMutation.isPending ||
    generateLicenseMutation.isPending;

  const selectedModule = modules.find(
    (softwareModule) => softwareModule.id === softwareModuleId,
  );

  const handleModuleChange = useCallback(
    (moduleId: string) => {
      setSoftwareModuleId(moduleId);
      const selected = modules.find((item) => item.id === moduleId);
      if (selected) {
        setCustomPrice(String(selected.basePrice));
      }
    },
    [modules],
  );

  const handlePresetSelect = useCallback((days: number) => {
    setSelectedPreset(days);
    setDurationInDays(String(days));
  }, []);

  const handleCustomDaysChange = useCallback((value: string) => {
    setDurationInDays(value);
    const parsed = Number(value);
    const matchingPreset = DURATION_PRESETS.find(
      (preset) => preset.days === parsed,
    );
    setSelectedPreset(matchingPreset ? matchingPreset.days : null);
  }, []);

  const resetForm = useCallback(() => {
    setMode("existing");
    setClientId("");
    setBusinessName("");
    setContactEmail("");
    setPhone("");
    setRegion("");
    setAlliancePartnerId("");
    setSoftwareModuleId("");
    setInstallationId("");
    setInstallationMode("existing");
    setNewInstallationIdentifier("");
    setNewInstallationHostname("");
    setCustomPrice("");
    setCommissionRate("20");
    setDurationInDays("365");
    setSelectedPreset(365);
    setGeneratedToken("");
    setError("");
    setCopied(false);
  }, []);

  const handleGenerate = useCallback(async () => {
    setError("");
    setGeneratedToken("");

    try {
      let targetClientId = clientId;

      if (mode === "new") {
        const created = await createClientMutation.mutateAsync({
          businessName,
          contactEmail,
          phone,
          region,
          alliancePartnerId: alliancePartnerId || undefined,
        });
        targetClientId = created.id;
      }

      if (!targetClientId || !softwareModuleId) {
        throw new Error("Client and software module are required");
      }

      let targetInstallationId = installationId;

      if (installationMode === "new") {
        if (!newInstallationIdentifier.trim()) {
          throw new Error("Installation identifier is required");
        }
        const createdInstallation = await createInstallationMutation.mutateAsync({
          clientId: targetClientId,
          installationIdentifier: newInstallationIdentifier.trim(),
          hostname: newInstallationHostname.trim() || undefined,
        });
        targetInstallationId = createdInstallation.id;
      }

      if (!targetInstallationId) {
        throw new Error("Installation is required");
      }

      const duration = Number(durationInDays);
      if (!Number.isFinite(duration) || duration < 1) {
        throw new Error("Duration must be a positive number");
      }

      const price = Number(customPrice);
      if (!Number.isFinite(price) || price < 0) {
        throw new Error("Final invoiced price must be a non-negative number");
      }

      const rate = Number(commissionRate);
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        throw new Error("Commission rate must be between 0 and 100");
      }

      const payload = await generateLicenseMutation.mutateAsync({
        clientId: targetClientId,
        softwareModuleId,
        installationId: targetInstallationId,
        durationInDays: duration,
        customPrice: price,
        commissionRate: rate,
      });

      setGeneratedToken(payload.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }, [
    alliancePartnerId,
    businessName,
    clientId,
    commissionRate,
    contactEmail,
    createClientMutation,
    customPrice,
    durationInDays,
    createInstallationMutation,
    generateLicenseMutation,
    installationId,
    installationMode,
    newInstallationHostname,
    newInstallationIdentifier,
    mode,
    phone,
    region,
    softwareModuleId,
  ]);

  const copyToken = useCallback(async () => {
    await navigator.clipboard.writeText(generatedToken);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [generatedToken]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) {
        resetForm();
      }
    },
    [resetForm],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">Generate License</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate License</DialogTitle>
          <DialogDescription>
            Onboard a client or select an existing one, then issue an RS256
            signed JWT license for an alliance partner.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant={mode === "existing" ? "default" : "outline"}
              onClick={() => setMode("existing")}
            >
              Existing Client
            </Button>
            <Button
              type="button"
              variant={mode === "new" ? "default" : "outline"}
              onClick={() => setMode("new")}
            >
              New Client
            </Button>
          </div>

          {mode === "existing" ? (
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <Select
                value={clientId}
                onValueChange={(value) => {
                  setClientId(value);
                  setInstallationId("");
                }}
              >
                <SelectTrigger id="client">
                  <SelectValue
                    placeholder={
                      clientsLoading ? "Loading clients..." : "Select a client"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.businessName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="region">Region</Label>
                <Input
                  id="region"
                  value={region}
                  onChange={(event) => setRegion(event.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="partner">Alliance Partner</Label>
                <Select
                  value={alliancePartnerId || NONE_PARTNER_VALUE}
                  onValueChange={(value) =>
                    setAlliancePartnerId(
                      value === NONE_PARTNER_VALUE ? "" : value,
                    )
                  }
                  disabled={partnersLoading}
                >
                  <SelectTrigger id="partner">
                    <SelectValue
                      placeholder={
                        partnersLoading
                          ? "Loading partners..."
                          : "Select alliance partner"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_PARTNER_VALUE}>
                      No partner assigned
                    </SelectItem>
                    {partners.map((partner) => (
                      <SelectItem key={partner.id} value={partner.id}>
                        {partner.name} — {partner.region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {(mode === "existing" && clientId) || mode === "new" ? (
            <div className="space-y-3">
              <Label>Installation</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant={installationMode === "existing" ? "default" : "outline"}
                  onClick={() => setInstallationMode("existing")}
                >
                  Select Existing
                </Button>
                <Button
                  type="button"
                  variant={installationMode === "new" ? "default" : "outline"}
                  onClick={() => setInstallationMode("new")}
                >
                  Create New
                </Button>
              </div>

              {installationMode === "existing" ? (
                <Select
                  value={installationId}
                  onValueChange={setInstallationId}
                  disabled={mode === "existing" && installationsLoading}
                >
                  <SelectTrigger id="installation">
                    <SelectValue
                      placeholder={
                        mode === "existing" && installationsLoading
                          ? "Loading installations..."
                          : "Select on-prem installation"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {installations.map((installation) => (
                      <SelectItem key={installation.id} value={installation.id}>
                        {installation.installationIdentifier}
                        {installation.hostname ? ` (${installation.hostname})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="newInstallationId">Installation Identifier</Label>
                    <Input
                      id="newInstallationId"
                      value={newInstallationIdentifier}
                      onChange={(e) => setNewInstallationIdentifier(e.target.value)}
                      placeholder="e.g. prod-site-01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newInstallationHost">Hostname (optional)</Label>
                    <Input
                      id="newInstallationHost"
                      value={newInstallationHostname}
                      onChange={(e) => setNewInstallationHostname(e.target.value)}
                      placeholder="server.example.com"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="module">Software Module</Label>
              <Select
                value={softwareModuleId}
                onValueChange={handleModuleChange}
                disabled={modulesLoading}
              >
                <SelectTrigger id="module">
                  <SelectValue
                    placeholder={
                      modulesLoading ? "Loading modules..." : "Select module"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((module) => (
                    <SelectItem key={module.id} value={module.id}>
                      {module.name} (₹{module.basePrice.toLocaleString("en-IN")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customPrice">Final Invoiced Price (₹)</Label>
              <Input
                id="customPrice"
                type="number"
                min={0}
                step={1}
                value={customPrice}
                onChange={(event) => setCustomPrice(event.target.value)}
                placeholder={
                  selectedModule
                    ? String(selectedModule.basePrice)
                    : "Select a module"
                }
              />
              {selectedModule ? (
                <p className="text-xs text-muted">
                  Catalog base price: ₹
                  {selectedModule.basePrice.toLocaleString("en-IN")}. Override to
                  apply a discount or upcharge.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="commissionRate">Commission Rate (%)</Label>
              <Input
                id="commissionRate"
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={commissionRate}
                onChange={(event) => setCommissionRate(event.target.value)}
              />
              <p className="text-xs text-muted">
                Applied when the client has an alliance partner assigned. Defaults
                to 20%.
              </p>
            </div>
            <div className="space-y-3 md:col-span-2">
              <Label>License Duration</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {DURATION_PRESETS.map((preset) => (
                  <Button
                    key={preset.days}
                    type="button"
                    variant={
                      selectedPreset === preset.days ? "default" : "outline"
                    }
                    onClick={() => handlePresetSelect(preset.days)}
                  >
                    {preset.label}
                    <span className="text-xs opacity-70">({preset.days})</span>
                  </Button>
                ))}
              </div>
              <div className="space-y-2">
                <Label htmlFor="durationInDays">Custom Days</Label>
                <Input
                  id="durationInDays"
                  type="number"
                  min={1}
                  value={durationInDays}
                  onChange={(event) =>
                    handleCustomDaysChange(event.target.value)
                  }
                />
              </div>
            </div>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <Button onClick={handleGenerate} disabled={isPending} className="w-full">
            {isPending ? "Generating..." : "Generate RS256 License"}
          </Button>

          {generatedToken ? (
            <div className="space-y-2">
              <Label htmlFor="token">Generated JWT</Label>
              <Textarea
                id="token"
                readOnly
                value={generatedToken}
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                onClick={copyToken}
                className="w-full"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy to Clipboard
                  </>
                )}
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
