import * as React from "react"
import { Minus, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

export interface NumberStepperProps extends Omit<React.ComponentProps<"input">, "type"> {
  step?: number | string
  min?: number | string
  max?: number | string
}

const NumberStepper = React.forwardRef<HTMLInputElement, NumberStepperProps>(
  ({ className, step = 1, min, max, ...props }, ref) => {
    const internalRef = React.useRef<HTMLInputElement>(null)

    // Merge forwarding ref and local ref
    React.useImperativeHandle(ref, () => internalRef.current!)

    const handleStep = (direction: "increment" | "decrement") => {
      const input = internalRef.current
      if (!input || input.disabled) return

      const currentStep = parseFloat(String(input.step)) || parseFloat(String(step)) || 1
      const currentMin = input.min !== "" ? parseFloat(input.min) : (min !== undefined ? parseFloat(String(min)) : undefined)
      const currentMax = input.max !== "" ? parseFloat(input.max) : (max !== undefined ? parseFloat(String(max)) : undefined)

      let currentValue = parseFloat(input.value)
      let newValue: number

      if (isNaN(currentValue)) {
        newValue = currentMin !== undefined ? currentMin : 0
      } else {
        newValue = direction === "increment" ? currentValue + currentStep : currentValue - currentStep
      }

      // Round to avoid floating point precision issues (e.g. 0.1 + 0.2 = 0.30000000004)
      const decimalPlaces = (String(currentStep).split(".")[1] || "").length
      newValue = parseFloat(newValue.toFixed(decimalPlaces))

      if (currentMin !== undefined && newValue < currentMin) {
        newValue = currentMin
      }
      if (currentMax !== undefined && newValue > currentMax) {
        newValue = currentMax
      }

      // React tracks input value changes internally. To trigger the onChange listener correctly,
      // we must get the native setter of value property and call it, then dispatch input/change events.
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
      if (valueSetter) {
        valueSetter.call(input, newValue)
      } else {
        input.value = String(newValue)
      }

      // Trigger standard React / DOM change tracking
      input.dispatchEvent(new Event("input", { bubbles: true }))
      input.dispatchEvent(new Event("change", { bubbles: true }))
    }

    return (
      <div
        className={cn(
          "relative flex items-center w-full border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/50",
          className
        )}
      >
        <button
          type="button"
          tabIndex={-1}
          disabled={props.disabled}
          onClick={() => handleStep("decrement")}
          className="flex h-11 w-11 md:h-8 md:w-8 shrink-0 items-center justify-center border-r border-input text-muted-foreground hover:bg-muted active:bg-muted/80 disabled:pointer-events-none disabled:opacity-50 transition-colors cursor-pointer select-none"
        >
          <Minus className="size-4 md:size-3.5" />
        </button>
        <input
          type="number"
          ref={internalRef}
          step={step}
          min={min}
          max={max}
          className={cn(
            "h-11 md:h-8 w-full min-w-0 bg-transparent px-2.5 py-1 text-center text-base md:text-sm transition-colors outline-none focus:outline-none placeholder:text-muted-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:cursor-not-allowed disabled:opacity-50"
          )}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={props.disabled}
          onClick={() => handleStep("increment")}
          className="flex h-11 w-11 md:h-8 md:w-8 shrink-0 items-center justify-center border-l border-input text-muted-foreground hover:bg-muted active:bg-muted/80 disabled:pointer-events-none disabled:opacity-50 transition-colors cursor-pointer select-none"
        >
          <Plus className="size-4 md:size-3.5" />
        </button>
      </div>
    )
  }
)
NumberStepper.displayName = "NumberStepper"

export { NumberStepper }
