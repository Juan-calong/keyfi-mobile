import React from "react";
import { Text, Pressable, ActivityIndicator } from "react-native";
import { act, create } from "react-test-renderer";
import { UnavailableCartItems } from "../UnavailableCartItems";

jest.mock("react-native", () => ({
  View: "View", Text: "Text", Pressable: "Pressable", ActivityIndicator: "ActivityIndicator",
  StyleSheet: { create: (styles: unknown) => styles },
}));

const reasons = [
  ["PRODUCT_INACTIVE", "Este produto não está mais disponível."],
  ["PRODUCT_MISSING", "Este produto não está mais disponível no catálogo."],
  ["FORBIDDEN_FOR_ROLE", "Este produto não está disponível para este perfil."],
] as const;

describe("UnavailableCartItems", () => {
  it.each(reasons)("shows %s with the expected message and no product ID", async (reason, message) => {
    let tree!: ReturnType<typeof create>;
    await act(async () => { tree = create(<UnavailableCartItems items={[{ productId: "secret-uuid", reason }]} pendingProductId={null} onRemove={jest.fn()} />); });
    const text = tree.root.findAllByType(Text).map((node) => node.children.join(" ")).join(" ");
    expect(text).toContain("Produtos indisponíveis");
    expect(text).toContain("Produto indisponível");
    expect(text).toContain(message);
    expect(text).toContain("Remover");
    expect(text).not.toContain("secret-uuid");
  });

  it("disables removal during a request and shows loading only on the pending item", async () => {
    const remove = jest.fn();
    let tree!: ReturnType<typeof create>;
    await act(async () => { tree = create(<UnavailableCartItems items={[
      { productId: "a", reason: "PRODUCT_INACTIVE" },
      { productId: "b", reason: "PRODUCT_MISSING" },
    ]} pendingProductId="a" onRemove={remove} />); });
    const buttons = tree.root.findAllByType(Pressable);
    expect(buttons[0].props.disabled).toBe(true);
    expect(buttons[1].props.disabled).toBe(true);
    expect(tree.root.findAllByType(ActivityIndicator)).toHaveLength(1);
    await act(async () => { tree.update(<UnavailableCartItems items={[
      { productId: "a", reason: "PRODUCT_INACTIVE" },
      { productId: "b", reason: "PRODUCT_MISSING" },
    ]} pendingProductId={null} onRemove={remove} />); });
    await act(async () => { tree.root.findAllByType(Pressable)[1].props.onPress(); });
    expect(remove).toHaveBeenCalledWith("b");
  });
});
