"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, ModalChassis, Textarea } from "@/components/ui";
import { useCreateCampaign } from "@/hooks/useCreateCampaign";

export interface NewCampaignModalProps {
  onClose: () => void;
  /*
    Seam for screen 3's adventure-prefilled variant (not built in this
    step): a title seed, a premise stub noting the source, a muted
    provenance line, and suppressing the link below would land here as
    additional optional props, e.g. prefill?: { title: string; premise: string; sourceLabel: string }.
  */
}

/** New campaign modal, blank variant only (screen 3). */
export function NewCampaignModal({ onClose }: NewCampaignModalProps) {
  const router = useRouter();
  const createCampaign = useCreateCampaign();
  const [title, setTitle] = useState("");
  const [premise, setPremise] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || createCampaign.isPending) return;

    const created = await createCampaign.mutateAsync({
      title,
      premise: premise.trim() ? premise : null,
    });

    onClose();
    router.push(`/campaigns/${created.id}`);
  }

  return (
    <ModalChassis
      title="New campaign"
      size="small"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-base">
          <Link
            href="/directory"
            onClick={onClose}
            className="text-ui text-link hover:text-link-hover"
          >
            or start from a published adventure
          </Link>
          <div className="flex gap-sm shrink-0">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="new-campaign-form"
              variant="primary"
              disabled={!title.trim() || createCampaign.isPending}
            >
              {createCampaign.isPending ? "Creating..." : "Create campaign"}
            </Button>
          </div>
        </div>
      }
    >
      <form id="new-campaign-form" onSubmit={handleSubmit} className="flex flex-col gap-base">
        <Input
          label="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          autoFocus
        />
        <Textarea
          label="Premise (optional)"
          value={premise}
          onChange={(event) => setPremise(event.target.value)}
          rows={4}
        />
      </form>
    </ModalChassis>
  );
}
