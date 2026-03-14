"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface WikiPageFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create-page" | "create-folder" | "rename";
  initialTitle?: string;
  onSubmit: (title: string) => void;
}

export function WikiPageForm({
  open,
  onOpenChange,
  mode,
  initialTitle = "",
  onSubmit,
}: WikiPageFormProps) {
  const [title, setTitle] = useState(initialTitle);

  const label =
    mode === "create-page"
      ? "New Page"
      : mode === "create-folder"
        ? "New Folder"
        : "Rename";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    onOpenChange(false);
    setTitle("");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setTitle(initialTitle);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <DialogFooter className="mt-4">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              {mode === "rename" ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
