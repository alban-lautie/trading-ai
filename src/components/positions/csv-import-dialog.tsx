"use client"

import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  importPositionsCsv,
  previewPositionsCsv,
  type CsvPreviewResult,
} from "@/features/positions/import-actions"

interface CsvImportDialogProps {
  trigger: React.ReactNode
}

/** Dialog to import positions from a CSV file, with a preview before import. */
export function CsvImportDialog({ trigger }: CsvImportDialogProps) {
  const [open, setOpen] = useState(false)
  const [fileText, setFileText] = useState<string | null>(null)
  const [preview, setPreview] = useState<CsvPreviewResult | null>(null)
  const [isPreviewing, startPreview] = useTransition()
  const [isImporting, startImport] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setFileText(null)
    setPreview(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) reset()
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setFileText(text)
    setPreview(null)
    startPreview(async () => {
      setPreview(await previewPositionsCsv(text))
    })
  }

  function handleImport() {
    if (!fileText) return
    startImport(async () => {
      const result = await importPositionsCsv(fileText)
      if (result.error) {
        toast.error(result.error)
        return
      }
      const skipped = result.skipped
        ? `, ${result.skipped} doublon(s) ignoré(s)`
        : ""
      toast.success(`${result.imported} position(s) importée(s)${skipped}`)
      handleOpenChange(false)
    })
  }

  const validRows = preview?.valid ?? []
  const duplicates = preview?.duplicates ?? []
  const errors = preview?.errors ?? []

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importer des positions</DialogTitle>
          <DialogDescription>
            Fichier CSV avec les colonnes <code>symbol</code>,{" "}
            <code>quantity</code>, <code>average_price</code> (obligatoires),{" "}
            <code>currency</code>, <code>name</code>, <code>opened_at</code>{" "}
            (optionnelles).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <Input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
          />

          {isPreviewing ? (
            <p className="text-muted-foreground text-sm">
              Analyse du fichier…
            </p>
          ) : null}

          {preview ? (
            <div className="grid gap-3 text-sm">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span className="font-medium text-emerald-600">
                  {validRows.length} à importer
                </span>
                {duplicates.length > 0 ? (
                  <span className="text-muted-foreground">
                    {duplicates.length} doublon(s) ignoré(s)
                  </span>
                ) : null}
                {errors.length > 0 ? (
                  <span className="text-destructive">
                    {errors.length} ligne(s) en erreur
                  </span>
                ) : null}
              </div>

              {validRows.length > 0 ? (
                <div className="max-h-40 overflow-y-auto rounded-md border">
                  {validRows.map((row) => (
                    <div
                      key={row.line}
                      className="flex justify-between gap-2 border-b px-3 py-1.5 text-xs last:border-b-0"
                    >
                      <span className="font-medium">{row.symbol}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {row.quantity} × {row.averagePrice} {row.currency}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              {errors.length > 0 ? (
                <ul className="border-destructive/30 bg-destructive/5 max-h-32 space-y-0.5 overflow-y-auto rounded-md border p-2 text-xs">
                  {errors.map((error) => (
                    <li
                      key={`${error.line}-${error.message}`}
                      className="text-destructive"
                    >
                      Ligne {error.line} : {error.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            onClick={handleImport}
            disabled={isImporting || isPreviewing || validRows.length === 0}
          >
            {isImporting
              ? "Import en cours…"
              : `Importer ${validRows.length} position(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
