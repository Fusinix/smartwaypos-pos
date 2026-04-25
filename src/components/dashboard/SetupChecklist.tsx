/** @format */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  Rocket,
  FolderKanban,
  Beer,
  Settings,
  ClipboardList,
  Utensils,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  route: string;
  done: boolean;
}

interface SetupChecklistProps {
  productCount: number;
  categoryCount: number;
  hasSettings: boolean;
  orderCount: number;
  foodItemCount: number;
}

export const SetupChecklist: React.FC<SetupChecklistProps> = ({
  productCount,
  categoryCount,
  hasSettings,
  orderCount,
  foodItemCount,
}) => {
  const navigate = useNavigate();

  const steps: ChecklistItem[] = [
    {
      id: "settings",
      label: "Configure Your Business",
      description: "Set your business name, currency, and receipt details.",
      icon: Settings,
      route: "/settings",
      done: hasSettings,
    },
    {
      id: "categories",
      label: "Add Drink Categories",
      description: "Create categories like Spirits, Beer, Soft Drinks.",
      icon: FolderKanban,
      route: "/categories",
      done: categoryCount > 0,
    },
    {
      id: "products",
      label: "Add Your First Drink",
      description: "Add drinks/products so you can start taking orders.",
      icon: Beer,
      route: "/products",
      done: productCount > 0,
    },
    {
      id: "food",
      label: "Add Food Items (Optional)",
      description: "Add your menu items for food orders.",
      icon: Utensils,
      route: "/food",
      done: foodItemCount > 0,
    },
    {
      id: "orders",
      label: "Place Your First Order",
      description: "Your POS is ready! Start taking orders.",
      icon: ClipboardList,
      route: "/orders",
      done: orderCount > 0,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;
  const progressPct = Math.round((completedCount / steps.length) * 100);

  // Hide widget once everything is done and there's real activity
  if (allDone && orderCount > 1) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-4 flex items-center gap-3 border-b">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Rocket className="size-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">
            {allDone ? "🎉 You're all set!" : "Getting Started"}
          </h3>
          <p className="text-xs text-gray-500">
            {allDone
              ? "Your POS system is fully configured and ready to use."
              : `${completedCount} of ${steps.length} steps completed`}
          </p>
        </div>
        {/* Progress Badge */}
        <div className="text-right">
          <span
            className={cn(
              "text-sm font-bold",
              allDone ? "text-green-600" : "text-primary"
            )}
          >
            {progressPct}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 bg-gray-100">
        <div
          className="h-full bg-primary transition-all duration-500 rounded-full"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Steps */}
      <div className="divide-y divide-gray-50">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <button
              key={step.id}
              onClick={() => navigate(step.route)}
              className={cn(
                "w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-colors text-left",
                step.done && "opacity-60"
              )}
            >
              {/* Status Icon */}
              <div className="flex-shrink-0">
                {step.done ? (
                  <CheckCircle2 className="size-5 text-green-500" />
                ) : (
                  <Circle className="size-5 text-gray-300" />
                )}
              </div>

              {/* Step Icon */}
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                  step.done ? "bg-green-50" : "bg-primary/10"
                )}
              >
                <Icon
                  className={cn(
                    "size-4",
                    step.done ? "text-green-500" : "text-primary"
                  )}
                />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    step.done
                      ? "line-through text-gray-400"
                      : "text-gray-800"
                  )}
                >
                  {step.label}
                </p>
                {!step.done && (
                  <p className="text-xs text-gray-500 truncate">
                    {step.description}
                  </p>
                )}
              </div>

              {/* Arrow */}
              {!step.done && (
                <ChevronRight className="size-4 text-gray-400 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
