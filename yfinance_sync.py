import yfinance as yf
import json
import pandas as pd

# 1. 股票清单
TICKERS = ["AAPL", "TSLA", "NVDA", "MSFT", "GOOGL", "AMZN", "META", "SPY"]
FILE_PATH = 'data.js'

def format_number(num):
    if num is None: return "N/A"
    if num >= 1_000_000_000_000: return f"{round(num/1e12, 2)}T"
    if num >= 1_000_000_000: return f"{round(num/1e9, 2)}B"
    return str(num)

def start_sync():
    full_db = {}
    print("🚀 启动【技术分析版】同步引擎 (含 MA50/MA200)...")
    print("------------------------------------------------")

    for ticker in TICKERS:
        print(f"📡 分析 {ticker} ...")
        try:
            stock = yf.Ticker(ticker)
            
            # A. 抓取历史数据
            hist = stock.history(period="10y")
            if hist.empty:
                print(f"⚠️ {ticker} 无数据")
                continue
            
            # B. 计算技术指标 (核心升级)
            # MA50: 50日均线 (生命线)
            hist['MA50'] = hist['Close'].rolling(window=50).mean()
            # MA200: 200日均线 (牛熊分界线)
            hist['MA200'] = hist['Close'].rolling(window=200).mean()
            
            # 填充 NaN (前几天没均线的数据填 None)
            hist = hist.fillna(0)

            # C. 格式化数据 (改为由三个数组组成，减少体积)
            # 为了前端好画图，我们直接存 list
            dates = [d.strftime('%Y-%m-%d') for d in hist.index]
            prices = [round(x, 2) for x in hist['Close']]
            ma50 = [round(x, 2) if x > 0 else None for x in hist['MA50']]
            ma200 = [round(x, 2) if x > 0 else None for x in hist['MA200']]

            # D. 获取基本面
            info = stock.info
            current_price = prices[-1]
            current_ma200 = ma200[-1]
            
            # 判断牛熊状态
            trend_status = "🐂 技术性牛市" if (current_ma200 and current_price > current_ma200) else "🐻 技术性熊市"

            stock_data = {
                "dates": dates,
                "prices": prices,
                "ma50": ma50,
                "ma200": ma200,
                "meta": {
                    "name": info.get('shortName', ticker),
                    "sector": info.get('sector', 'Unknown'),
                    "marketCap": format_number(info.get('marketCap')),
                    "peRatio": round(info.get('trailingPE', 0), 2) if info.get('trailingPE') else "N/A",
                    "week52High": info.get('fiftyTwoWeekHigh', 0),
                    "trend": trend_status,  # 写入趋势判断
                    "lastUpdate": dates[-1]
                }
            }
            
            full_db[ticker] = stock_data
            print(f"✅ {ticker} 成功: {trend_status} (MA200: {current_ma200})")
            
        except Exception as e:
            print(f"❌ {ticker} 失败: {e}")

    # E. 写入文件
    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        f.write(f"const STOCK_HISTORICAL_DATA = {json.dumps(full_db, indent=4)};")
    
    print("------------------------------------------------")
    print(f"✨ 技术指标已更新！请运行网页查看牛熊线。")

if __name__ == "__main__":
    start_sync()