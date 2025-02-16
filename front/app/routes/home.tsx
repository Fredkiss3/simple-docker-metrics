import { Form, useSearchParams } from "react-router";
import type { Route } from "./+types/home";
import {
	Activity,
	ArrowDownRight,
	ArrowUpRight,
	MicrochipIcon,
	CpuIcon,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import * as React from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "~/components/ui/chart";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { queryClient } from "~/root";

export function meta() {
	return [
		{ title: "New React Router App" },
		{ name: "description", content: "Welcome to React Router!" },
	];
}

type ApiData = {
	cpu_percent: number;
	memory_limit: number;
	memory_usage: number;
	rx_bytes: number;
	tx_bytes: number;
	read_bytes: number;
	write_bytes: number;
};
const containerMetricsQuery = (containerId?: string | null) =>
	queryOptions({
		queryKey: ["metrics", containerId],
		queryFn: async ({ signal }) => {
			return await fetch(
				`http://localhost:5000/api/docker-stats/${containerId}`,
				{
					signal,
					headers: {
						Accept: "application/json",
						"Content-Type": "application/json",
					},
				},
			).then((r) => r.json() as Promise<ApiData>);
		},
		enabled: !!containerId,
	});

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
	// const containerId = new URL(request.url).searchParams.get("container_id");
	// const metrics = await queryClient.ensureQueryData(
	// 	containerMetricsQuery(containerId),
	// );
	// return {
	// 	metrics,
	// };
}
const mb = 1024 ** 2;

export default function Home({ loaderData }: Route.ComponentProps) {
	const [sp] = useSearchParams();

	const containerId = sp.get("container_id")?.toString();

	const [metrics, setMetrics] = React.useState<
		Array<{
			index: number;
			cpuPercent: number;
			memoryUsage: number;
			netOut: number;
			netIn: number;
			diskRead: number;
			diskWrites: number;
		}>
	>([]);

	// const { data } = useQuery({
	// 	...containerMetricsQuery(containerId),
	// 	initialData: loaderData.metrics,
	// });

	React.useEffect(() => {
		const ctrl = new AbortController();
		let ignore = false;

		setMetrics([]);

		const fetchData = async () => {
			const data = await fetch(
				`http://localhost:5000/api/docker-stats/${containerId}`,
				{
					signal: ctrl.signal,
					headers: {
						Accept: "application/json",
						"Content-Type": "application/json",
					},
				},
			).then((r) => r.json() as Promise<ApiData>);

			if (!ignore) {
				// ...
				setMetrics((prev) => {
					return [
						...prev,
						{
							index: prev.length,
							...data,
							cpuPercent: data.cpu_percent,
							memoryUsage: data.memory_usage / mb,
							netOut: data.tx_bytes / mb,
							netIn: data.rx_bytes / mb,
							diskRead: data.read_bytes / mb,
							diskWrites: data.write_bytes / mb,
						},
					];
				});
			}
		};

		if (!containerId) return;

		fetchData();
		const interval = setInterval(fetchData, 5_000);
		return () => {
			ignore = true;
			ctrl.abort();
			clearInterval(interval);
		};
	}, [containerId]);

	console.log({
		metrics,
	});

	return (
		<main className="p-12 flex flex-col gap-4">
			<h1 className="text-2xl">Docker metrics</h1>
			<Form method="GET" className="flex items-center gap-2">
				<Input
					placeholder="container id"
					name="container_id"
					defaultValue={containerId}
				/>
				<Button>Search</Button>
			</Form>
			<div className="grid grid-cols-1 gap-5 md:grid-cols-2">
				<CustomAreaChart
					data={metrics.slice(-20)}
					title="CPU"
					description="max 12"
					config={{
						cpuPercent: {
							label: "CPU percentage",
							color: "hsl(var(--chart-1))",
							icon: CpuIcon,
						},
					}}
					areas={["cpuPercent"]}
					valueFormatter={(value: number) => `${value.toFixed(2)}%`}
				/>
				<CustomAreaChart
					data={metrics.slice(-20)}
					title="Memory"
					description="in MB"
					config={{
						memoryUsage: {
							label: "memory",
							color: "hsl(var(--chart-2))",
							icon: MicrochipIcon,
						},
					}}
					areas={["memoryUsage"]}
					valueFormatter={(value: number) => `${value.toFixed(2)}mb`}
				/>
				<CustomAreaChart
					data={metrics.slice(-20)}
					title="Network"
					description="in bytes"
					config={{
						netOut: {
							label: "outbound",
							color: "hsl(var(--chart-3))",
							// icon: ArrowUpRight,
						},
						netIn: {
							label: "inbound",
							color: "hsl(var(--chart-4))",
							// icon: ArrowDownRight,
						},
					}}
					valueFormatter={(value: number) => `${value.toFixed(2)}mb`}
					areas={["netOut", "netIn"]}
				/>
				<CustomAreaChart
					data={metrics.slice(-20)}
					title="Disk I/O"
					description="In MB"
					config={{
						diskRead: {
							label: "read",
							color: "hsl(var(--chart-5))",
							// icon: ArrowUpRight,
						},
						diskWrites: {
							label: "writes",
							color: "hsl(var(--chart-1))",
							// icon: ArrowDownRight,
						},
					}}
					valueFormatter={(value: number) => `${value.toFixed(2)}mb`}
					areas={["diskRead", "diskWrites"]}
				/>
			</div>
		</main>
	);
}

const chartConfig = {
	cpuPercent: {
		label: "CPU percentage",
		color: "hsl(var(--chart-1))",
		icon: Activity,
	},
} satisfies ChartConfig;

function CustomAreaChart({
	data,
	className,
	title,
	description,
	areas,
	config,
	valueFormatter,
}: {
	data: Array<{
		index: number;
	}>;
	title: string;
	description: string;
	config: ChartConfig;
	valueFormatter?: (value: any) => string;
	className?: string;
	areas: Array<string>;
}) {
	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription className="text-muted-foreground">
					{description}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer config={config}>
					<AreaChart
						accessibilityLayer
						data={data}
						margin={{
							left: 12,
							right: 12,
						}}
					>
						<CartesianGrid vertical={false} />
						<YAxis tickLine={false} axisLine={false} />
						<XAxis
							dataKey="index"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
						/>

						<ChartTooltip
							cursor={false}
							content={
								<ChartTooltipContent
									hideLabel
									valueFormatter={valueFormatter}
								/>
							}
						/>

						{areas.map((key) => {
							return (
								<Area
									key={key}
									dataKey={key}
									type="step"
									fill={`var(--color-${key})`}
									fillOpacity={0.4}
									isAnimationActive={false}
									stroke={`var(--color-${key})`}
								/>
							);
						})}
					</AreaChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
