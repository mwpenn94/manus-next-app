
"use client";

import * as React from "react";
import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// 1. Data and Type Definitions
type Role = "Admin" | "User" | "Developer";
type Status = "Active" | "Inactive" | "Pending";

type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: Status;
  createdAt: Date;
};

const mockData: User[] = [
  { id: "usr_1", name: "John Doe", email: "john.doe@example.com", role: "Admin", status: "Active", createdAt: new Date("2023-01-15") },
  { id: "usr_2", name: "Jane Smith", email: "jane.smith@example.com", role: "User", status: "Active", createdAt: new Date("2023-02-20") },
  { id: "usr_3", name: "Sam Wilson", email: "sam.wilson@example.com", role: "Developer", status: "Pending", createdAt: new Date("2023-03-10") },
  { id: "usr_4", name: "Alice Johnson", email: "alice.j@example.com", role: "User", status: "Inactive", createdAt: new Date("2022-12-05") },
  { id: "usr_5", name: "Robert Brown", email: "robert.b@example.com", role: "Developer", status: "Active", createdAt: new Date("2023-04-01") },
  { id: "usr_6", name: "Emily Davis", email: "emily.d@example.com", role: "User", status: "Active", createdAt: new Date("2023-05-22") },
  { id: "usr_7", name: "Michael Miller", email: "michael.m@example.com", role: "Admin", status: "Inactive", createdAt: new Date("2021-11-30") },
  { id: "usr_8", name: "Jessica Garcia", email: "jessica.g@example.com", role: "Developer", status: "Pending", createdAt: new Date("2023-06-18") },
  { id: "usr_9", name: "David Martinez", email: "david.m@example.com", role: "User", status: "Active", createdAt: new Date("2023-07-02") },
  { id: "usr_10", name: "Sarah Rodriguez", email: "sarah.r@example.com", role: "User", status: "Active", createdAt: new Date("2023-08-11") },
  { id: "usr_11", name: "Chris Lee", email: "chris.l@example.com", role: "Developer", status: "Active", createdAt: new Date("2023-09-05") },
  { id: "usr_12", name: "Patricia Hernandez", email: "patricia.h@example.com", role: "Admin", status: "Pending", createdAt: new Date("2023-10-15") },
];

type SortConfig = {
  key: keyof User;
  direction: "ascending" | "descending";
} | null;

const DataTableAdvanced = () => {
  const [data, setData] = useState<User[]>(mockData);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 });
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
    id: false,
    createdAt: false,
  });

  const filteredData = useMemo(() => {
    let filtered = data;

    if (globalFilter) {
      filtered = filtered.filter(item =>
        Object.values(item).some(value =>
          String(value).toLowerCase().includes(globalFilter.toLowerCase())
        )
      );
    }

    return filtered;
  }, [data, globalFilter]);

  const sortedData = useMemo(() => {
    let sortableItems = [...filteredData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sortConfig]);

  const paginatedData = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    const end = start + pagination.pageSize;
    return sortedData.slice(start, end);
  }, [sortedData, pagination]);

  const requestSort = (key: keyof User) => {
    let direction: "ascending" | "descending" = "ascending";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const pageCount = Math.ceil(sortedData.length / pagination.pageSize);

  return (
    <Card className="w-full max-w-6xl mx-auto bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Users</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Filter all columns..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="max-w-sm"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-auto">
                  Columns <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {Object.keys(mockData[0]).map((key) => (
                  <DropdownMenuCheckboxItem
                    key={key}
                    className="capitalize"
                    checked={!columnVisibility[key]}
                    onCheckedChange={(value) =>
                      setColumnVisibility((prev) => ({ ...prev, [key]: !value }))
                    }
                  >
                    {key}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="p-4 font-medium text-left">
                  <Checkbox
                    checked={Object.keys(rowSelection).length === paginatedData.length && paginatedData.length > 0}
                    onCheckedChange={(value) => {
                      const newSelection: Record<string, boolean> = {};
                      if (value) {
                        paginatedData.forEach(row => newSelection[row.id] = true);
                      }
                      setRowSelection(newSelection);
                    }}
                  />
                </th>
                {Object.keys(mockData[0]).map((key) => {
                  if (columnVisibility[key]) return null;
                  return (
                    <th key={key} className="p-4 font-medium text-left cursor-pointer" onClick={() => requestSort(key as keyof User)}>
                      <div className="flex items-center gap-2">
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                        {sortConfig?.key === key && (
                          sortConfig.direction === "ascending" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                  );
                })}
                 <th className="p-4 font-medium text-left">Actions</th>
              </tr>
            </thead>
            <AnimatePresence>
              <tbody>
                {paginatedData.map((row) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-b border-border hover:bg-muted/50"
                  >
                    <td className="p-4">
                      <Checkbox
                        checked={rowSelection[row.id] || false}
                        onCheckedChange={(value) => {
                          setRowSelection((prev) => ({ ...prev, [row.id]: !!value }));
                        }}
                      />
                    </td>
                    {Object.keys(row).map((key) => {
                      if (columnVisibility[key]) return null;
                      return (
                        <td key={key} className="p-4 text-muted-foreground">
                          {key === 'status' ? (
                            <Badge variant={row.status === 'Active' ? 'default' : row.status === 'Pending' ? 'secondary' : 'outline'}>{row.status}</Badge>
                          ) : key === 'createdAt' ? (
                            row.createdAt.toLocaleDateString()
                          ) : (
                            (row as any)[key]
                          )}
                        </td>
                      );
                    })}
                    <td className="p-4">
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="w-8 h-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem>Delete</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>View details</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </AnimatePresence>
          </table>
        </div>
        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-muted-foreground">
            {Object.keys(rowSelection).length} of {data.length} row(s) selected.
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <p className="text-sm font-medium">Rows per page</p>
                <Select
                    value={`${pagination.pageSize}`}
                    onValueChange={(value) => {
                        setPagination(p => ({...p, pageSize: Number(value)}));
                    }}
                >
                    <SelectTrigger className="h-8 w-[70px]">
                        <SelectValue placeholder={pagination.pageSize} />
                    </SelectTrigger>
                    <SelectContent side="top">
                        {[5, 10, 20, 30, 40, 50].map((pageSize) => (
                            <SelectItem key={pageSize} value={`${pageSize}`}>
                                {pageSize}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex w-[100px] items-center justify-center text-sm font-medium">
              Page {pagination.pageIndex + 1} of {pageCount}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(p => ({...p, pageIndex: p.pageIndex - 1}))}
                disabled={pagination.pageIndex === 0}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(p => ({...p, pageIndex: p.pageIndex + 1}))}
                disabled={pagination.pageIndex >= pageCount - 1}
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataTableAdvanced;
