import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  isOnline: boolean;
}

interface CollaboratorAvatarsProps {
  collaborators: Collaborator[];
}

const collaboratorColors = [
  "bg-collaboration",
  "bg-accent",
  "bg-warning",
  "bg-secondary",
];

export const CollaboratorAvatars = ({
  collaborators,
}: CollaboratorAvatarsProps) => {
  return (
    <div className="flex items-center gap-1">
      {collaborators.map((collaborator, index) => (
        <Tooltip key={collaborator.id}>
          <TooltipTrigger asChild>
            <div className="relative">
              <Avatar
                className={`h-8 w-8 border-2 border-card ${
                  collaboratorColors[index % collaboratorColors.length]
                } ${collaborator.isOnline ? "collaborator-pulse" : "opacity-50"}`}
              >
                <AvatarFallback
                  className={`text-xs font-medium ${
                    collaboratorColors[index % collaboratorColors.length]
                  }`}
                >
                  {collaborator.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              {collaborator.isOnline && (
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-online border-2 border-card" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {collaborator.name}{" "}
              <span className="text-muted-foreground">
                ({collaborator.isOnline ? "Online" : "Offline"})
              </span>
            </p>
          </TooltipContent>
        </Tooltip>
      ))}
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="h-8 w-8 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary ink-transition">
            <span className="text-sm">+</span>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Invite collaborator</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
