const mongoose = require("mongoose");
const Menu = require("./models/Menu");
const Order = require("./models/Order");
const OrderItem = require("./models/OrderItem");

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/poblaGO", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testServingsReduction() {
  try {
    console.log("🧪 Testing Servings Reduction Functionality...\n");

    // Find a menu item to test with
    const menuItem = await Menu.findOne({});
    if (!menuItem) {
      console.log("❌ No menu items found. Please create a menu item first.");
      return;
    }

    console.log(`📋 Testing with menu item: ${menuItem.name}`);
    console.log(`📊 Initial servings: ${menuItem.servings}\n`);

    // Create a test order
    const testOrder = new Order({
      customer_name: "Test Customer",
      table_number: "Test Table",
      total_amount: menuItem.price * 2,
      staff_member: new mongoose.Types.ObjectId(), // Dummy staff member
      payment_method: "cash",
    });

    await testOrder.save();
    console.log("✅ Test order created");

    // Create order items
    const orderItems = [
      {
        order_id: testOrder._id,
        item_name: menuItem.name,
        quantity: 2,
        price: menuItem.price,
        total_price: menuItem.price * 2,
        menu_item_id: menuItem._id,
        special_instructions: "",
      },
    ];

    await OrderItem.insertMany(orderItems);
    console.log("✅ Order items created");

    // Simulate the servings reduction process
    const updatedMenuItem = await Menu.findById(menuItem._id);
    console.log(`📊 Servings before reduction: ${updatedMenuItem.servings}`);

    // Check if sufficient servings are available
    if (!updatedMenuItem.hasSufficientServings(2)) {
      console.log("❌ Insufficient servings available");
      return;
    }

    // Reduce servings
    updatedMenuItem.servings -= 2;
    await updatedMenuItem.save();
    console.log(`📊 Servings after reduction: ${updatedMenuItem.servings}`);

    // Test restoration when order is cancelled
    console.log("\n🔄 Testing servings restoration...");
    updatedMenuItem.servings += 2;
    await updatedMenuItem.save();
    console.log(`📊 Servings after restoration: ${updatedMenuItem.servings}`);

    // Clean up test data
    await OrderItem.deleteMany({ order_id: testOrder._id });
    await Order.findByIdAndDelete(testOrder._id);
    console.log("🧹 Test data cleaned up");

    console.log(
      "\n✅ Servings reduction functionality test completed successfully!"
    );
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  } finally {
    mongoose.connection.close();
  }
}

// Run the test
testServingsReduction();
