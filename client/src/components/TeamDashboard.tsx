import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Plus, Users, TrendingUp, CheckCircle, Clock, XCircle, ShieldAlert, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Type definitions
type ActivityData = number[];
type MemberStatus = 'Online' | 'Offline' | 'In a meeting' | 'Away';
type MemberRole = 'Engineer' | 'Designer' | 'Product Manager' | 'QA';

interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  role: MemberRole;
  activity: ActivityData;
  status: MemberStatus;
  tasksCompleted: number;
  tasksInProgress: number;
}

interface TaskDistribution {
  category: string;
  count: number;
  color: string;
}

// Mock Data
const teamMembersData: TeamMember[] = [
  { id: '1', name: 'Alex Johnson', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d', role: 'Engineer', activity: [5, 8, 3, 9, 4, 7, 6], status: 'Online', tasksCompleted: 12, tasksInProgress: 3 },
  { id: '2', name: 'Maria Garcia', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d', role: 'Designer', activity: [2, 5, 8, 4, 7, 3, 5], status: 'In a meeting', tasksCompleted: 8, tasksInProgress: 2 },
  { id: '3', name: 'James Smith', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026706d', role: 'Product Manager', activity: [9, 7, 6, 8, 5, 9, 7], status: 'Online', tasksCompleted: 10, tasksInProgress: 1 },
  { id: '4', name: 'Patricia Brown', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026707d', role: 'Engineer', activity: [4, 6, 7, 5, 8, 6, 7], status: 'Away', tasksCompleted: 15, tasksInProgress: 4 },
  { id: '5', name: 'Robert Jones', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026708d', role: 'QA', activity: [7, 8, 9, 7, 6, 8, 9], status: 'Offline', tasksCompleted: 20, tasksInProgress: 1 },
  { id: '6', name: 'Linda Miller', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026709d', role: 'Engineer', activity: [6, 7, 5, 8, 6, 7, 8], status: 'Online', tasksCompleted: 18, tasksInProgress: 2 },
  { id: '7', name: 'Michael Davis', avatar: 'https://i.pravatar.cc/150?u=a042581f4e2902670ad', role: 'Designer', activity: [3, 4, 5, 4, 5, 4, 5], status: 'Away', tasksCompleted: 7, tasksInProgress: 1 },
  { id: '8', name: 'Barbara Wilson', avatar: 'https://i.pravatar.cc/150?u=a042581f4e2902670bd', role: 'Product Manager', activity: [8, 9, 8, 9, 8, 9, 8], status: 'In a meeting', tasksCompleted: 11, tasksInProgress: 0 },
];

const taskDistributionData: TaskDistribution[] = [
  { category: 'Features', count: 45, color: '#3b82f6' },
  { category: 'Bugs', count: 25, color: '#ef4444' },
  { category: 'Chores', count: 15, color: '#f97316' },
  { category: 'Tests', count: 15, color: '#84cc16' },
];

const weeklyActivityData = Array.from({ length: 7 }, (_, dayIndex) =>
  Array.from({ length: 8 }, (_, memberIndex) => Math.floor(Math.random() * 12))
);

const teamVelocityData = [50, 55, 65, 60, 70, 75, 85, 80, 90, 95, 100, 105];

export default function TeamDashboard() {
  const [members, setMembers] = useState<TeamMember[]>(teamMembersData);

  const handleRoleChange = (memberId: string, newRole: MemberRole) => {
    setMembers(prevMembers =>
      prevMembers.map(member =>
        member.id === memberId ? { ...member, role: newRole } : member
      )
    );
  };

  return (
    <div className="bg-background text-foreground p-4 sm:p-6 lg:p-8 space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Team Dashboard</h1>
          <p className="text-muted-foreground">Manage your team and track performance.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button> 
              <Plus className="mr-2 h-4 w-4" /> Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite New Member</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input id="email" type="email" placeholder="name@example.com" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">Role</Label>
                <Select>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engineer">Engineer</SelectItem>
                    <SelectItem value="designer">Designer</SelectItem>
                    <SelectItem value="pm">Product Manager</SelectItem>
                    <SelectItem value="qa">QA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full">Send Invite</Button>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Users className="mr-2" /> Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <AnimatePresence>
                  {members.map(member => (
                    <TeamMemberCard key={member.id} member={member} onRoleChange={handleRoleChange} />
                  ))}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><TrendingUp className="mr-2" /> Team Velocity</CardTitle>
            </CardHeader>
            <CardContent>
              <TeamVelocityChart data={teamVelocityData} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Weekly Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <WeeklyActivityHeatmap data={weeklyActivityData} />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Task Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <PieChart data={taskDistributionData} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Member Status</CardTitle>
            </CardHeader>
            <CardContent>
              <MemberStatusGrid members={members} />
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}

// Helper Components
const Sparkline = ({ data, width = 100, height = 30, color = "#3b82f6" }: { data: number[], width?: number, height?: number, color?: string }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d - min) / (max - min === 0 ? 1 : max - min)) * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
};

const TeamMemberCard = ({ member, onRoleChange }: { member: TeamMember, onRoleChange: (id: string, role: MemberRole) => void }) => {
  const statusIndicator = {
    Online: "bg-green-500",
    Offline: "bg-gray-500",
    "In a meeting": "bg-yellow-500",
    Away: "bg-orange-500",
  };

  return (
    <motion.div layout transition={{ duration: 0.3 }}>
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Avatar>
                <AvatarImage src={member.avatar} alt={member.name} />
                <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ${statusIndicator[member.status]} border-2 border-card`} />
            </div>
            <div className="flex-1">
              <p className="font-semibold">{member.name}</p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="-ml-2 h-auto py-0 text-muted-foreground">
                    {member.role} <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {(["Engineer", "Designer", "Product Manager", "QA"] as MemberRole[]).map(role => (
                    <DropdownMenuItem key={role} onSelect={() => onRoleChange(member.id, role)}>
                      {role}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div>
              <Sparkline data={member.activity} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const PieChart = ({ data, size = 200 }: { data: TaskDistribution[], size?: number }) => {
  const radius = size / 2 - 10;
  const center = size / 2;
  let cumulativePercent = 0;

  const segments = data.map(item => {
    const percent = item.count / data.reduce((sum, i) => sum + i.count, 0);
    const startAngle = cumulativePercent * 2 * Math.PI;
    cumulativePercent += percent;
    const endAngle = cumulativePercent * 2 * Math.PI;
    const largeArcFlag = percent > 0.5 ? 1 : 0;

    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);

    return {
      path: `M ${center},${center} L ${x1},${y1} A ${radius},${radius} 0 ${largeArcFlag},1 ${x2},${y2} Z`,
      color: item.color,
      category: item.category,
    };
  });

  return (
    <div className="flex items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <AnimatePresence>
          {segments.map((segment, index) => (
            <motion.path
              key={index}
              d={segment.path}
              fill={segment.color}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              whileHover={{ opacity: 0.8 }}
            />
          ))}
        </AnimatePresence>
      </svg>
      <div className="ml-6 space-y-2">
        {data.map(item => (
          <div key={item.category} className="flex items-center">
            <span className="h-3 w-3 rounded-full mr-2" style={{ backgroundColor: item.color }} />
            <span className="text-sm text-muted-foreground">{item.category}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const WeeklyActivityHeatmap = ({ data }: { data: number[][] }) => {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const maxActivity = Math.max(...data.flat());

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-8 gap-1" style={{ minWidth: "600px" }}>
        <div />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="text-center text-xs text-muted-foreground">Member {i + 1}</div>
        ))}
        {days.map((day, dayIndex) => (
          <React.Fragment key={day}>
            <div className="text-xs text-muted-foreground self-center text-right pr-1">{day}</div>
            {data[dayIndex].map((activity, memberIndex) => (
              <motion.div
                key={`${dayIndex}-${memberIndex}`}
                className="h-10 w-full rounded-sm border border-transparent"
                style={{ backgroundColor: `rgba(59, 130, 246, ${activity / maxActivity})` }}
                whileHover={{ scale: 1.1, border: "1px solid #fff" }}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

const TeamVelocityChart = ({ data }: { data: number[] }) => {
  const width = 500;
  const height = 150;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d - min) / (max - min)) * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
        </linearGradient>
      </defs>
      <motion.path
        d={`M 0,${height} ${points} L ${width},${height} Z`}
        fill="url(#velocityGradient)"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2 }}
      />
      <motion.polyline
        points={points}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2, delay: 0.5 }}
      />
    </svg>
  );
};

const MemberStatusGrid = ({ members }: { members: TeamMember[] }) => {
  const getStatusIcon = (status: MemberStatus) => {
    switch (status) {
      case "Online": return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "Offline": return <XCircle className="h-5 w-5 text-gray-500" />;
      case "In a meeting": return <Clock className="h-5 w-5 text-yellow-500" />;
      case "Away": return <ShieldAlert className="h-5 w-5 text-orange-500" />;
      default: return null;
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {members.map(member => (
        <motion.div key={member.id} whileHover={{ y: -5 }}>
          <Card className="h-full">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <Avatar className="mb-2">
                <AvatarImage src={member.avatar} alt={member.name} />
                <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <p className="font-semibold text-sm">{member.name}</p>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                {getStatusIcon(member.status)}
                <span className="ml-1.5">{member.status}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};
