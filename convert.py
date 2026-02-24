import json
import os

def brute_force_upgrade():
    file_path = 'data.js'
    if not os.path.exists(file_path):
        print("❌ 错误：找不到 data.js")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 定义我们要提取的所有变量名
    targets = {
        "SPY": "rawSpyData",
        "NVDA": "rawNvdaData",
        "AAPL": "rawAppleData",
        "TSLA": "rawTeslaData",
        "MSFT": "rawMsftData",
        "GOOGL": "rawGoogleData",
        "AMZN": "rawAmazonData",
        "META": "rawMetaData"
    }

    final_storage = {}

    for ticker, var_name in targets.items():
        # 定位变量开始的位置
        start_idx = content.find(f"{var_name} = `")
        if start_idx == -1:
            start_idx = content.find(f"{var_name} = '") # 兼容单引号
        
        if start_idx != -1:
            # 找到起始引号后的内容
            quote_char = content[start_idx + len(var_name) + 3]
            data_start = start_idx + len(var_name) + 4
            data_end = content.find(quote_char, data_start)
            
            raw_str = content[data_start:data_end].strip()
            
            # 解析行
            ticker_data = {}
            lines = raw_str.split('\n')
            for line in lines:
                parts = line.split()
                if len(parts) >= 2:
                    date = parts[0]
                    try:
                        price = float(parts[-1])
                        ticker_data[date] = price
                    except:
                        continue
            
            final_storage[ticker] = ticker_data
            print(f"✅ 深度抓取成功: {ticker} ({len(ticker_data)} 条记录)")
        else:
            print(f"⚠️ 找不到变量: {var_name}")

    if final_storage:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(f"const STOCK_HISTORICAL_DATA = {json.dumps(final_storage, indent=4)};")
        print("\n🚀 全量无损转换完成！请检查记录数是否已恢复正常。")

if __name__ == "__main__":
    brute_force_upgrade()