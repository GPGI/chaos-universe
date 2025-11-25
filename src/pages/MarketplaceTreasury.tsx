import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp, Wallet, Users, ArrowUpRight, ArrowDownRight, Zap, Shield,
  Link2, AlertTriangle, CheckCircle, XCircle, Vote, Lock, Unlock,
  Layers, BarChart3, Sparkles, Globe, Coins
} from 'lucide-react';

export default function DAOFinancialHub() {
  const [selectedTab, setSelectedTab] = useState('overview');
  
  const address = '0x742d...3f4a';
  const daoBalance = 2847.32;
  const votingPower = 15.4;
  const stakedTokens = 10000;
  
  const portfolios = [
    { id: 1, name: 'DeFi Yield Farm', value: 45000, roi: 34.5, autoCompound: true, compoundRate: 80, riskLevel: 'medium', strategy: 'yield_farming' },
    { id: 2, name: 'Blue Chip Stack', value: 28000, roi: 12.3, autoCompound: false, compoundRate: 50, riskLevel: 'low', strategy: 'hodl' }
  ];
  
  const loanChains = [
    {
      id: 1, name: 'ETH → USDC → AAVE Loop', collateral: 'ETH', collateralAmount: 10,
      chainDepth: 3, totalLeverage: 2.8, apy: 18.5, liquidationRisk: 23, healthFactor: 1.65, status: 'active',
      positions: [
        { protocol: 'AAVE', asset: 'ETH', supplied: 10, borrowed: 7000, apy: 3.2 },
        { protocol: 'Compound', asset: 'USDC', supplied: 7000, borrowed: 4900, apy: 5.8 },
        { protocol: 'AAVE', asset: 'USDC', supplied: 4900, borrowed: 0, apy: 4.1 }
      ]
    },
    {
      id: 2, name: 'AVAX Recursive Lending', collateral: 'AVAX', collateralAmount: 500,
      chainDepth: 4, totalLeverage: 3.2, apy: 22.3, liquidationRisk: 45, healthFactor: 1.32, status: 'warning',
      positions: [
        { protocol: 'Benqi', asset: 'AVAX', supplied: 500, borrowed: 375, apy: 4.5 },
        { protocol: 'Trader Joe', asset: 'AVAX', supplied: 375, borrowed: 281, apy: 6.2 },
        { protocol: 'Benqi', asset: 'AVAX', supplied: 281, borrowed: 211, apy: 4.8 },
        { protocol: 'AAVE', asset: 'AVAX', supplied: 211, borrowed: 0, apy: 5.1 }
      ]
    }
  ];
  
  const proposals = [
    { id: 1, title: 'Increase Collateral Ratio to 150%', description: 'Reduce liquidation risk by requiring higher collateral', votesFor: 145000, votesAgainst: 32000, status: 'active', endTime: '2d 4h', quorum: 100000 },
    { id: 2, title: 'Enable wBTC as Collateral', description: 'Add wrapped Bitcoin as accepted collateral for loan chains', votesFor: 89000, votesAgainst: 78000, status: 'active', endTime: '5d 12h', quorum: 100000 },
    { id: 3, title: 'Treasury Diversification into Real Yield', description: 'Allocate 30% of treasury to GMX, GLP, and sfrxETH', votesFor: 210000, votesAgainst: 15000, status: 'passed', endTime: 'Ended', quorum: 100000 }
  ];
  
  const vaults = [
    { id: 1, name: 'Neutral Delta Vault', strategy: 'Market neutral hedging with perpetuals', apy: 28.5, tvl: 1240000, risk: 'low', yourDeposit: 5000, performance30d: 2.3 },
    { id: 2, name: 'Degen Leverage Vault', strategy: 'Aggressive leverage on trending assets', apy: 87.2, tvl: 340000, risk: 'extreme', yourDeposit: 0, performance30d: 12.8 },
    { id: 3, name: 'Stable Yield Optimizer', strategy: 'Auto-compound stablecoin yields across protocols', apy: 12.4, tvl: 5600000, risk: 'low', yourDeposit: 15000, performance30d: 1.1 }
  ];

  const getRiskColor = (risk) => {
    if (risk < 30) return 'text-green-400';
    if (risk < 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getHealthColor = (health) => {
    if (health >= 1.5) return 'text-green-400';
    if (health >= 1.2) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-b from-purple-950/20 via-black to-black -z-10"></div>
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent -z-10"></div>
      
      <div className="fixed inset-0 -z-10">
        {[...Array(150)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              opacity: Math.random() * 0.7 + 0.2
            }}
          ></div>
        ))}
      </div>

      <div className="container mx-auto p-6 space-y-8 relative z-10">
        <div className="flex justify-between items-start">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30">
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></div>
              <span className="text-xs text-purple-300 font-medium">Genesis Phase Active</span>
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-500 bg-clip-text text-transparent">
              Financial Hub
            </h1>
            <p className="text-gray-400 text-lg">
              From rebellion to renaissance. Explore portfolios, manage chains, build empires.
            </p>
          </div>
          <Card className="border-purple-500/30 bg-black/40 backdrop-blur-xl">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <div>
                  <p className="text-xs text-gray-400">Connected</p>
                  <p className="font-mono text-sm text-purple-300">{address}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-purple-500/30 bg-gradient-to-br from-purple-950/40 via-black/40 to-black/40 backdrop-blur-xl hover:border-purple-500/50 transition-all">
            <CardHeader className="pb-2">
              <CardDescription className="text-gray-400">Total Portfolio Value</CardDescription>
              <CardTitle className="text-3xl text-white">${(portfolios.reduce((acc, p) => acc + p.value, 0) + daoBalance).toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm">
                <ArrowUpRight className="h-4 w-4 text-green-400" />
                <span className="text-green-400">+24.3%</span>
                <span className="text-gray-500">30d</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-500/30 bg-gradient-to-br from-purple-950/40 via-black/40 to-black/40 backdrop-blur-xl hover:border-purple-500/50 transition-all">
            <CardHeader className="pb-2">
              <CardDescription className="text-gray-400">Active Loan Chains</CardDescription>
              <CardTitle className="text-3xl text-white">{loanChains.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm">
                <Layers className="h-4 w-4 text-purple-400" />
                <span className="text-gray-400">Avg Leverage: {(loanChains.reduce((acc, c) => acc + c.totalLeverage, 0) / loanChains.length).toFixed(1)}x</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-500/30 bg-gradient-to-br from-purple-950/40 via-black/40 to-black/40 backdrop-blur-xl hover:border-purple-500/50 transition-all">
            <CardHeader className="pb-2">
              <CardDescription className="text-gray-400">Voting Power</CardDescription>
              <CardTitle className="text-3xl text-white">{votingPower}%</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm">
                <Vote className="h-4 w-4 text-pink-400" />
                <span className="text-gray-400">{stakedTokens.toLocaleString()} staked</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-500/30 bg-gradient-to-br from-purple-950/40 via-black/40 to-black/40 backdrop-blur-xl hover:border-purple-500/50 transition-all">
            <CardHeader className="pb-2">
              <CardDescription className="text-gray-400">Total APY</CardDescription>
              <CardTitle className="text-3xl text-green-400">
                {(loanChains.reduce((acc, c) => acc + c.apy, 0) / loanChains.length).toFixed(1)}%
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <span className="text-gray-400">Weighted average</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="bg-black/60 border border-purple-500/30 backdrop-blur-xl">
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600/30 data-[state=active]:text-purple-300">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="loan-chains" className="data-[state=active]:bg-purple-600/30 data-[state=active]:text-purple-300">
              <Link2 className="h-4 w-4 mr-2" />
              Loan Chains
            </TabsTrigger>
            <TabsTrigger value="vaults" className="data-[state=active]:bg-purple-600/30 data-[state=active]:text-purple-300">
              <Layers className="h-4 w-4 mr-2" />
              Strategy Vaults
            </TabsTrigger>
            <TabsTrigger value="governance" className="data-[state=active]:bg-purple-600/30 data-[state=active]:text-purple-300">
              <Vote className="h-4 w-4 mr-2" />
              Governance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-purple-500/30 bg-black/40 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <Button className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                    <Link2 className="h-4 w-4" />
                    New Loan Chain
                  </Button>
                  <Button variant="outline" className="gap-2 border-purple-500/30 hover:bg-purple-500/10 text-white">
                    <Layers className="h-4 w-4" />
                    Deposit to Vault
                  </Button>
                  <Button variant="outline" className="gap-2 border-purple-500/30 hover:bg-purple-500/10 text-white">
                    <Zap className="h-4 w-4" />
                    Auto-Compound
                  </Button>
                  <Button variant="outline" className="gap-2 border-purple-500/30 hover:bg-purple-500/10 text-white">
                    <Vote className="h-4 w-4" />
                    Vote on Proposal
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-purple-500/30 bg-black/40 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Shield className="h-5 w-5 text-yellow-400" />
                    Risk Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Portfolio Risk Score</span>
                      <span className="text-yellow-400 font-medium">Medium</span>
                    </div>
                    <Progress value={45} className="h-2 bg-purple-950/50" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Liquidation Risk</span>
                      <span className="text-orange-400 font-medium">
                        {Math.round(loanChains.reduce((acc, c) => acc + c.liquidationRisk, 0) / loanChains.length)}%
                      </span>
                    </div>
                    <Progress value={34} className="h-2 bg-purple-950/50" />
                  </div>
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-xs text-yellow-400 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      1 chain requires rebalancing
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-purple-500/30 bg-black/40 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white">Active Portfolios</CardTitle>
                <CardDescription className="text-gray-400">
                  Managed portfolios with auto-compounding
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {portfolios.map((portfolio) => (
                    <div key={portfolio.id} className="p-4 rounded-lg border border-purple-500/30 bg-purple-950/20 hover:bg-purple-950/30 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-white">{portfolio.name}</h4>
                          <Badge variant="outline" className="mt-1 text-xs border-purple-500/30 text-purple-300">
                            {portfolio.strategy}
                          </Badge>
                        </div>
                        <Badge className={portfolio.riskLevel === 'low' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}>
                          {portfolio.riskLevel} risk
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-gray-400">Value</p>
                          <p className="text-lg font-bold text-white">${portfolio.value.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">ROI</p>
                          <p className="text-lg font-bold text-green-400">+{portfolio.roi}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Auto-Compound</p>
                          <Switch checked={portfolio.autoCompound} className="mt-1" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="loan-chains" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">Recursive Loan Chains</h2>
                <p className="text-gray-400">Leverage your collateral across multiple protocols</p>
              </div>
              <Button className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                <Link2 className="h-4 w-4" />
                Create New Chain
              </Button>
            </div>

            {loanChains.map((chain) => (
              <Card key={chain.id} className={`border-2 ${chain.status === 'warning' ? 'border-yellow-500/50' : 'border-purple-500/30'} bg-black/40 backdrop-blur-xl`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-white flex items-center gap-2">
                        {chain.name}
                        {chain.status === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-400" />}
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        {chain.chainDepth} positions • {chain.totalLeverage}x leverage
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10">
                        <Zap className="h-4 w-4 mr-1" />
                        Rebalance
                      </Button>
                      <Button variant="outline" size="sm" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                        <XCircle className="h-4 w-4 mr-1" />
                        Unwind
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-3 rounded-lg bg-purple-950/30 border border-purple-500/20">
                      <p className="text-xs text-gray-400">Collateral</p>
                      <p className="text-lg font-bold text-white">{chain.collateralAmount} {chain.collateral}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-purple-950/30 border border-purple-500/20">
                      <p className="text-xs text-gray-400">Total APY</p>
                      <p className="text-lg font-bold text-green-400">{chain.apy}%</p>
                    </div>
                    <div className="p-3 rounded-lg bg-purple-950/30 border border-purple-500/20">
                      <p className="text-xs text-gray-400">Health Factor</p>
                      <p className={`text-lg font-bold ${getHealthColor(chain.healthFactor)}`}>
                        {chain.healthFactor.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-purple-950/30 border border-purple-500/20">
                      <p className="text-xs text-gray-400">Liq. Risk</p>
                      <p className={`text-lg font-bold ${getRiskColor(chain.liquidationRisk)}`}>
                        {chain.liquidationRisk}%
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-purple-300">Chain Positions</p>
                    {chain.positions.map((pos, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center gap-4 p-3 rounded-lg bg-purple-950/20 border border-purple-500/20">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/20 text-purple-300 font-bold text-sm border border-purple-500/30">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-white">{pos.protocol}</p>
                              <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-300">
                                {pos.asset}
                              </Badge>
                            </div>
                            <div className="flex gap-4 text-xs text-gray-400">
                              <span>Supplied: {pos.supplied.toLocaleString()}</span>
                              {pos.borrowed > 0 && <span>Borrowed: {pos.borrowed.toLocaleString()}</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-400">APY</p>
                            <p className="text-sm font-bold text-green-400">{pos.apy}%</p>
                          </div>
                        </div>
                        {idx < chain.positions.length - 1 && (
                          <div className="flex justify-center py-1">
                            <ArrowDownRight className="h-5 w-5 text-purple-400" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {chain.status === 'warning' && (
                    <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
                        <div>
                          <p className="font-semibold text-yellow-400 mb-1">High Risk Position</p>
                          <p className="text-sm text-yellow-400/80">
                            Health factor is below 1.5. Consider adding collateral or reducing leverage.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="vaults" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Strategy Vaults</h2>
              <p className="text-gray-400">Automated strategies managed by smart contracts</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {vaults.map((vault) => (
                <Card key={vault.id} className="border-purple-500/30 bg-black/40 backdrop-blur-xl hover:border-purple-500/50 transition-all">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-white">{vault.name}</CardTitle>
                        <CardDescription className="text-gray-400 mt-1">{vault.strategy}</CardDescription>
                      </div>
                      <Badge className={
                        vault.risk === 'low' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                        vault.risk === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                        'bg-red-500/20 text-red-400 border-red-500/30'
                      }>
                        {vault.risk}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-400">APY</p>
                        <p className="text-2xl font-bold text-green-400">{vault.apy}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">TVL</p>
                        <p className="text-lg font-bold text-white">${(vault.tvl / 1000).toFixed(0)}K</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">30d Perf</p>
                        <p className="text-lg font-bold text-green-400">+{vault.performance30d}%</p>
                      </div>
                    </div>

                    {vault.yourDeposit > 0 && (
                      <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-purple-300">Your Deposit</span>
                          <span className="text-lg font-bold text-purple-300">${vault.yourDeposit.toLocaleString()}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                        {vault.yourDeposit > 0 ? 'Add More' : 'Deposit'}
                      </Button>
                      {vault.yourDeposit > 0 && (
                        <Button variant="outline" className="flex-1 border-purple-500/30 text-white hover:bg-purple-500/10">
                          Withdraw
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="governance" className="space-y-6">
            <Card className="border-purple-500/30 bg-black/40 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white">Your Voting Power</CardTitle>
                <CardDescription className="text-gray-400">
                  Stake tokens to increase your influence
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-purple-950/30 border border-purple-500/20">
                    <p className="text-sm text-gray-400 mb-1">Proposals Voted</p>
                    <p className="text-2xl font-bold text-white">12</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                    <Lock className="h-4 w-4 mr-2" />
                    Stake More
                  </Button>
                  <Button variant="outline" className="border-purple-500/30 text-white hover:bg-purple-500/10">
                    <Unlock className="h-4 w-4 mr-2" />
                    Unstake
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div>
              <h3 className="text-xl font-bold text-white mb-4">Active Proposals</h3>
              <div className="space-y-4">
                {proposals.filter(p => p.status === 'active').map((proposal) => (
                  <Card key={proposal.id} className="border-purple-500/30 bg-black/40 backdrop-blur-xl">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-white text-lg">{proposal.title}</CardTitle>
                          <CardDescription className="text-gray-400 mt-1">
                            {proposal.description}
                          </CardDescription>
                        </div>
                        <Badge className="bg-purple-500/20 text-purple-300 ml-4 border-purple-500/30">
                          {proposal.endTime}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-green-400">For: {proposal.votesFor.toLocaleString()}</span>
                          <span className="text-red-400">Against: {proposal.votesAgainst.toLocaleString()}</span>
                        </div>
                        <div className="relative h-3 bg-purple-950/50 rounded-full overflow-hidden border border-purple-500/20">
                          <div 
                            className="absolute h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all"
                            style={{ width: `${(proposal.votesFor / (proposal.votesFor + proposal.votesAgainst)) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>Quorum: {proposal.quorum.toLocaleString()}</span>
                          <span>{((proposal.votesFor + proposal.votesAgainst) / proposal.quorum * 100).toFixed(0)}% reached</span>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button className="flex-1 bg-green-600 hover:bg-green-700">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Vote For
                        </Button>
                        <Button variant="outline" className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10">
                          <XCircle className="h-4 w-4 mr-2" />
                          Vote Against
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-4">Recent Decisions</h3>
              <div className="space-y-4">
                {proposals.filter(p => p.status === 'passed').map((proposal) => (
                  <Card key={proposal.id} className="border-green-500/30 bg-black/40 backdrop-blur-xl">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-white text-lg">{proposal.title}</CardTitle>
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Passed
                            </Badge>
                          </div>
                          <CardDescription className="text-gray-400 mt-1">
                            {proposal.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between text-sm">
                        <span className="text-green-400">For: {proposal.votesFor.toLocaleString()}</span>
                        <span className="text-red-400">Against: {proposal.votesAgainst.toLocaleString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Card className="border-purple-500/30 bg-black/40 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white">Create New Proposal</CardTitle>
                <CardDescription className="text-gray-400">
                  Requires 50,000 staked tokens to submit
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Proposal Title</label>
                  <Input 
                    placeholder="e.g., Add support for new collateral type"
                    className="bg-purple-950/30 border-purple-500/30 text-white placeholder:text-gray-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Description</label>
                  <textarea 
                    placeholder="Detailed description of your proposal..."
                    rows={4}
                    className="w-full px-3 py-2 bg-purple-950/30 border border-purple-500/30 rounded-md text-white placeholder:text-gray-500"
                  />
                </div>
                <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                  <Vote className="h-4 w-4 mr-2" />
                  Submit Proposal
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="border-purple-500/30 bg-gradient-to-br from-purple-950/40 via-black/40 to-black/40 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Wallet className="h-5 w-5 text-purple-400" />
              DAO Treasury
            </CardTitle>
            <CardDescription className="text-gray-400">
              Community-managed funds • Transparent allocation • On-chain verification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-purple-950/30 border border-purple-500/20">
                <p className="text-xs text-gray-400">Total Value</p>
                <p className="text-xl font-bold text-white">${daoBalance.toFixed(2)}M</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-950/30 border border-purple-500/20">
                <p className="text-xs text-gray-400">Liquid Assets</p>
                <p className="text-xl font-bold text-green-400">$1.2M</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-950/30 border border-purple-500/20">
                <p className="text-xs text-gray-400">Staked/Locked</p>
                <p className="text-xl font-bold text-purple-400">$1.6M</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-950/30 border border-purple-500/20">
                <p className="text-xs text-gray-400">Monthly Yield</p>
                <p className="text-xl font-bold text-pink-400">$45K</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-purple-950/20 border border-purple-500/20">
              <h4 className="font-semibold text-white mb-3">Asset Allocation</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Stablecoins</span>
                    <span className="text-white font-medium">42%</span>
                  </div>
                  <Progress value={42} className="h-2 bg-purple-950/50" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">ETH/BTC</span>
                    <span className="text-white font-medium">28%</span>
                  </div>
                  <Progress value={28} className="h-2 bg-purple-950/50" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">DeFi Positions</span>
                    <span className="text-white font-medium">23%</span>
                  </div>
                  <Progress value={23} className="h-2 bg-purple-950/50" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Other</span>
                    <span className="text-white font-medium">7%</span>
                  </div>
                  <Progress value={7} className="h-2 bg-purple-950/50" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}   
