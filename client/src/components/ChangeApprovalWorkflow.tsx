import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, Clock, X, MessageSquare, Users, GitMerge, Undo2, Calendar, ChevronRight } from "lucide-react";

type ApprovalStatus = "approved" | "pending" | "rejected";

type Approver = {
  name: string;
  avatarUrl: string;
  status: ApprovalStatus;
  date: string;
};

type Comment = {
  id: string;
  author: string;
  avatarUrl: string;
  text: string;
  timestamp: string;
};

type ChangeRequest = {
  id: string;
  title: string;
  description: string;
  requester: { name: string; avatarUrl: string };
  priority: "High" | "Medium" | "Low";
  approvers: Approver[];
  comments: Comment[];
  deploymentTime: string;
  hasRollbackPlan: boolean;
};

const mockChangeRequests: ChangeRequest[] = [
  {
    id: "CR-001",
    title: "Update Production API Gateway to v2.1",
    description: "This change involves upgrading the API gateway to enhance security and performance. Includes new rate limiting policies and improved logging.",
    requester: { name: "Alice Johnson", avatarUrl: "https://i.pravatar.cc/150?u=alice" },
    priority: "High",
    approvers: [
      { name: "Bob Williams", avatarUrl: "https://i.pravatar.cc/150?u=bob", status: "approved", date: "2026-05-02" },
      { name: "Charlie Brown", avatarUrl: "https://i.pravatar.cc/150?u=charlie", status: "approved", date: "2026-05-02" },
      { name: "Diana Prince", avatarUrl: "https://i.pravatar.cc/150?u=diana", status: "pending", date: "" },
    ],
    comments: [
        { id: "C1", author: "Bob Williams", avatarUrl: "https://i.pravatar.cc/150?u=bob", text: "Looks good, performance benchmarks are solid.", timestamp: "2 hours ago" },
    ],
    deploymentTime: "2026-05-10 23:00 UTC",
    hasRollbackPlan: true,
  },
  {
    id: "CR-002",
    title: "Deploy new marketing landing page",
    description: "A/B testing new landing page design for the summer campaign. Initial deployment to 10% of traffic.",
    requester: { name: "Eve Adams", avatarUrl: "https://i.pravatar.cc/150?u=eve" },
    priority: "Medium",
    approvers: [
      { name: "Frank Miller", avatarUrl: "https://i.pravatar.cc/150?u=frank", status: "approved", date: "2026-05-01" },
      { name: "Grace Lee", avatarUrl: "https://i.pravatar.cc/150?u=grace", status: "rejected", date: "2026-05-01" },
    ],
    comments: [
        { id: "C2", author: "Grace Lee", avatarUrl: "https://i.pravatar.cc/150?u=grace", text: "Rejected. The CTA button color does not meet accessibility standards.", timestamp: "1 day ago" },
    ],
    deploymentTime: "2026-05-08 14:00 UTC",
    hasRollbackPlan: true,
  },
  {
    id: "CR-003",
    title: "Patch critical Log4j vulnerability on internal servers",
    description: "Urgent security patch for CVE-2021-44228 on all internal-facing Java applications.",
    requester: { name: "Heidi Clark", avatarUrl: "https://i.pravatar.cc/150?u=heidi" },
    priority: "High",
    approvers: [
      { name: "Security Team", avatarUrl: "https://i.pravatar.cc/150?u=sec", status: "approved", date: "2026-04-30" },
      { name: "Infra Team", avatarUrl: "https://i.pravatar.cc/150?u=infra", status: "approved", date: "2026-04-30" },
    ],
    comments: [],
    deploymentTime: "2026-05-01 02:00 UTC",
    hasRollbackPlan: false,
  },
  {
    id: "CR-004",
    title: "Minor text changes for user dashboard",
    description: "Updating tooltip text and correcting a typo in the main dashboard welcome message.",
    requester: { name: "Ivan Petrov", avatarUrl: "https://i.pravatar.cc/150?u=ivan" },
    priority: "Low",
    approvers: [
      { name: "Judy Hopps", avatarUrl: "https://i.pravatar.cc/150?u=judy", status: "pending", date: "" },
    ],
    comments: [],
    deploymentTime: "2026-05-05 10:00 UTC",
    hasRollbackPlan: false,
  },
];

const StatusIcon = ({ status }: { status: ApprovalStatus }) => {
  const iconMap = {
    approved: <Check className="h-5 w-5 text-green-500" />,
    pending: <Clock className="h-5 w-5 text-yellow-500" />,
    rejected: <X className="h-5 w-5 text-red-500" />,
  };
  return <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">{iconMap[status]}</div>;
};

const PriorityBadge = ({ priority }: { priority: "High" | "Medium" | "Low" }) => {
  const colorMap = {
    High: "bg-red-500/20 text-red-400 border-red-500/30",
    Medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    Low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };
  return <Badge className={cn("border", colorMap[priority])}>{priority}</Badge>;
};

const ChangeRequestCard = ({ request }: { request: ChangeRequest }) => {
  const [isOpen, setIsOpen] = useState(false);

  const approvalStatus = useMemo(() => {
    if (request.approvers.some(a => a.status === 'rejected')) return 'rejected';
    if (request.approvers.every(a => a.status === 'approved')) return 'approved';
    return 'pending';
  }, [request.approvers]);

  return (
    <motion.div layout className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="p-6 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <StatusIcon status={approvalStatus} />
            <div>
              <h3 className="text-lg font-semibold">{request.title}</h3>
              <p className="text-sm text-muted-foreground">Requested by {request.requester.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <PriorityBadge priority={request.priority} />
            <motion.div animate={{ rotate: isOpen ? 90 : 0 }}>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </motion.div>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6">
              <Separator className="my-4" />
              <p className="text-sm text-muted-foreground mb-4">{request.description}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-semibold text-sm mb-3 flex items-center"><Users className="mr-2 h-4 w-4" />Approval Chain</h4>
                  <div className="relative pl-4">
                    {request.approvers.map((approver, index) => (
                      <motion.div key={index} className="flex items-start gap-4 pb-6 relative" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}>
                        {index < request.approvers.length - 1 && (
                          <div className="absolute left-[19px] top-5 h-full w-0.5 bg-border" />
                        )}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                                <Avatar className="h-10 w-10 border-2 border-transparent group-hover:border-primary transition-colors">
                                    <AvatarImage src={approver.avatarUrl} alt={approver.name} />
                                    <AvatarFallback>{approver.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{approver.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm">{approver.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {approver.status === 'approved' && <Check className="h-3 w-3 text-green-500" />}
                                {approver.status === 'pending' && <Clock className="h-3 w-3 text-yellow-500" />}
                                {approver.status === 'rejected' && <X className="h-3 w-3 text-red-500" />}
                                <span className="capitalize">{approver.status}</span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">{approver.date || "Awaiting response"}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-3 flex items-center"><MessageSquare className="mr-2 h-4 w-4" />Comments</h4>
                  <div className="space-y-4">
                    {request.comments.length > 0 ? request.comments.map((comment) => (
                      <div key={comment.id} className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={comment.avatarUrl} alt={comment.author} />
                          <AvatarFallback>{comment.author.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="bg-muted p-3 rounded-lg w-full">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-xs">{comment.author}</p>
                            <p className="text-xs text-muted-foreground">{comment.timestamp}</p>
                          </div>
                          <p className="text-sm">{comment.text}</p>
                        </div>
                      </div>
                    )) : <p className="text-sm text-muted-foreground italic">No comments yet.</p>}
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Scheduled for: {request.deploymentTime}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Undo2 className="h-4 w-4" />
                    <span>Rollback Plan: {request.hasRollbackPlan ? <span className="text-green-400 font-semibold">Available</span> : <span className="text-yellow-400 font-semibold">Not Available</span>}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <GitMerge className="h-4 w-4" />
                    <span>ID: {request.id}</span>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline">Reject</Button>
                <Button>Approve</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default function ChangeApprovalWorkflow() {
  return (
    <div className="bg-background text-foreground min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Change Approval Workflow</h1>
          <p className="text-muted-foreground">Review and approve pending change requests.</p>
        </div>
        <div className="space-y-4">
          {mockChangeRequests.map((request) => (
            <ChangeRequestCard key={request.id} request={request} />
          ))}
        </div>
      </div>
    </div>
  );
}
